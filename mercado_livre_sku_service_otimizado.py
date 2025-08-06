import requests
from backend_sellerbot.settings import get_logger

logger = get_logger("app_mercado_livre_sku_service_otimizado")


class MercadoLivreSKUServiceOtimizado:
    
    @staticmethod
    def search_items_by_sku_ultra_otimizado(account, sku):
        """
        VERSÃO ULTRA OTIMIZADA - Usa filtros da API para buscar por SKU
        
        Parâmetros disponíveis na API:
        - q: busca por texto (pode incluir SKU)
        - attributes: filtros por atributos específicos
        - custom_field: filtro por campo customizado
        
        :param account: Conta do MercadoLivre autenticada
        :param sku: SKU a ser buscado
        :return: Lista de itens que possuem o SKU
        """
        logger.info(f"[search_items_by_sku_ultra_otimizado] Conta {account.account_id} | SKU={sku}")
        
        if not MercadoLivreSKUServiceOtimizado._ensure_valid_token(account):
            logger.warning("Token inválido / expirado.")
            return []
        
        found_items = []
        headers = {"Authorization": f"Bearer {account.access_token}"}
        
        try:
            # ESTRATÉGIA 1: Busca usando parâmetro 'q' (query text)
            # A API pode encontrar itens que contenham o SKU no título, descrição ou campos customizados
            items_by_query = MercadoLivreSKUServiceOtimizado._search_with_query_filter(
                account, sku, headers
            )
            found_items.extend(items_by_query)
            
            # ESTRATÉGIA 2: Busca usando filtros específicos se disponível
            # Alguns parâmetros que podem funcionar (dependem da implementação da API)
            items_by_filters = MercadoLivreSKUServiceOtimizado._search_with_custom_filters(
                account, sku, headers
            )
            found_items.extend(items_by_filters)
            
            # ESTRATÉGIA 3: Se as anteriores não funcionarem, usar busca otimizada por lotes
            if not found_items:
                logger.info("Filtros diretos não retornaram resultados. Usando busca otimizada por lotes.")
                found_items = MercadoLivreSKUServiceOtimizado._search_by_batches_optimized(
                    account, sku, headers
                )
            
            # Remover duplicatas baseado no ID
            unique_items = []
            seen_ids = set()
            for item in found_items:
                item_id = item.get('id')
                if item_id and item_id not in seen_ids:
                    seen_ids.add(item_id)
                    unique_items.append(item)
            
            logger.info(f"Busca ultra otimizada concluída: {len(unique_items)} itens únicos com SKU {sku}")
            return unique_items
            
        except requests.RequestException as e:
            logger.error(f"Erro na busca ultra otimizada por SKU {sku}: {e}")
            return []
    
    @staticmethod
    def _search_with_query_filter(account, sku, headers):
        """
        Busca usando o parâmetro 'q' que pode encontrar SKUs em vários campos
        """
        found_items = []
        
        # Tentar diferentes variações de busca
        search_queries = [
            sku,                    # SKU exato
            f'"{sku}"',            # SKU entre aspas
            sku.replace('-', ' '),  # SKU com hífens substituídos por espaços
            sku.replace('_', ' '),  # SKU com underscores substituídos por espaços
        ]
        
        for query in search_queries:
            try:
                url = f"https://api.mercadolibre.com/users/{account.account_id}/items/search"
                params = {
                    'q': query,
                    'status': 'active',  # Buscar apenas ativos por padrão
                    'limit': 50
                }
                
                response = requests.get(url, headers=headers, params=params, timeout=30)
                response.raise_for_status()
                
                data = response.json()
                item_ids = data.get("results", [])
                
                if item_ids:
                    logger.info(f"Query '{query}' encontrou {len(item_ids)} itens")
                    
                    # Buscar detalhes dos itens encontrados
                    detailed_items = MercadoLivreSKUServiceOtimizado._get_items_details_batch(
                        item_ids, headers
                    )
                    
                    # Filtrar apenas itens que realmente contêm o SKU
                    for item in detailed_items:
                        if MercadoLivreSKUServiceOtimizado._item_contains_sku(item, sku):
                            found_items.append(item)
                
            except requests.RequestException as e:
                logger.warning(f"Erro na busca com query '{query}': {e}")
                continue
        
        return found_items
    
    @staticmethod
    def _search_with_custom_filters(account, sku, headers):
        """
        Tenta usar filtros específicos da API (podem não estar documentados publicamente)
        """
        found_items = []
        
        # Tentar diferentes parâmetros de filtro que podem existir
        filter_attempts = [
            {'seller_custom_field': sku},
            {'custom_field': sku},
            {'attributes': f'SELLER_SKU:{sku}'},
            {'sku': sku},
        ]
        
        for filters in filter_attempts:
            try:
                url = f"https://api.mercadolibre.com/users/{account.account_id}/items/search"
                params = {
                    'status': 'active',
                    'limit': 50,
                    **filters
                }
                
                response = requests.get(url, headers=headers, params=params, timeout=30)
                
                # Se não der erro 400 (parâmetro inválido), processar resultado
                if response.status_code == 200:
                    data = response.json()
                    item_ids = data.get("results", [])
                    
                    if item_ids:
                        logger.info(f"Filtro {filters} encontrou {len(item_ids)} itens")
                        
                        detailed_items = MercadoLivreSKUServiceOtimizado._get_items_details_batch(
                            item_ids, headers
                        )
                        
                        for item in detailed_items:
                            if MercadoLivreSKUServiceOtimizado._item_contains_sku(item, sku):
                                found_items.append(item)
                
            except requests.RequestException as e:
                # Ignorar erros de parâmetros inválidos
                if "400" not in str(e):
                    logger.warning(f"Erro com filtro {filters}: {e}")
                continue
        
        return found_items
    
    @staticmethod
    def _search_by_batches_optimized(account, sku, headers):
        """
        Versão otimizada da busca por lotes como fallback
        """
        found_items = []
        
        try:
            # Buscar apenas IDs primeiro
            url = f"https://api.mercadolibre.com/users/{account.account_id}/items/search"
            params = {
                'status': 'active',
                'limit': 50  # Limitar para não sobrecarregar
            }
            
            response = requests.get(url, headers=headers, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            item_ids = data.get("results", [])
            
            logger.info(f"Buscando SKU {sku} em {len(item_ids)} itens ativos")
            
            # Processar em lotes menores para melhor performance
            batch_size = 20
            for i in range(0, len(item_ids), batch_size):
                batch = item_ids[i:i + batch_size]
                
                detailed_items = MercadoLivreSKUServiceOtimizado._get_items_details_batch(
                    batch, headers
                )
                
                for item in detailed_items:
                    if MercadoLivreSKUServiceOtimizado._item_contains_sku(item, sku):
                        found_items.append(item)
                        logger.info(f"SKU {sku} encontrado no item {item.get('id')}")
        
        except requests.RequestException as e:
            logger.error(f"Erro na busca por lotes: {e}")
        
        return found_items
    
    @staticmethod
    def _get_items_details_batch(item_ids, headers):
        """
        Obtém detalhes de múltiplos itens em uma única requisição
        """
        if not item_ids:
            return []
        
        try:
            ids_param = ",".join(item_ids)
            url = f"https://api.mercadolibre.com/items?ids={ids_param}"
            
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            
            batch_results = response.json()
            items = []
            
            for result in batch_results:
                if result.get("code") == 200:
                    item_data = result.get("body")
                    if item_data:
                        items.append(item_data)
            
            return items
            
        except requests.RequestException as e:
            logger.error(f"Erro ao buscar detalhes em lote: {e}")
            return []
    
    @staticmethod
    def _item_contains_sku(item_data, sku):
        """
        Verifica se um item contém o SKU especificado.
        Busca no seller_custom_field e nas variações.
        """
        if not item_data:
            return False
            
        sku_normalized = sku.strip().upper()
        
        # 1. Verificar no seller_custom_field principal
        seller_custom_field = item_data.get("seller_custom_field")
        if seller_custom_field and seller_custom_field.strip().upper() == sku_normalized:
            return True
        
        # 2. Verificar nas variações
        variations = item_data.get("variations", [])
        for variation in variations:
            # Verificar seller_custom_field da variação
            var_custom_field = variation.get("seller_custom_field")
            if var_custom_field and var_custom_field.strip().upper() == sku_normalized:
                return True
            
            # Verificar attributes da variação
            attributes = variation.get("attributes", [])
            for attr in attributes:
                if attr.get("id") == "SELLER_SKU" and attr.get("value_name"):
                    if attr.get("value_name").strip().upper() == sku_normalized:
                        return True
        
        return False
    
    @staticmethod
    def search_items_by_sku_all_statuses(account, sku):
        """
        Busca SKU em todos os status de itens usando filtros otimizados
        """
        logger.info(f"[search_items_by_sku_all_statuses] Conta {account.account_id} | SKU={sku}")
        
        if not MercadoLivreSKUServiceOtimizado._ensure_valid_token(account):
            logger.warning("Token inválido / expirado.")
            return []
        
        all_found_items = []
        headers = {"Authorization": f"Bearer {account.access_token}"}
        statuses = ["active", "paused", "closed"]
        
        for status in statuses:
            try:
                # Usar busca com query para cada status
                url = f"https://api.mercadolibre.com/users/{account.account_id}/items/search"
                params = {
                    'q': sku,
                    'status': status,
                    'limit': 50
                }
                
                response = requests.get(url, headers=headers, params=params, timeout=30)
                response.raise_for_status()
                
                data = response.json()
                item_ids = data.get("results", [])
                
                if item_ids:
                    detailed_items = MercadoLivreSKUServiceOtimizado._get_items_details_batch(
                        item_ids, headers
                    )
                    
                    for item in detailed_items:
                        if MercadoLivreSKUServiceOtimizado._item_contains_sku(item, sku):
                            item["_search_status"] = status  # Marcar o status
                            all_found_items.append(item)
                
                logger.info(f"Status {status}: {len([i for i in all_found_items if i.get('_search_status') == status])} itens")
                
            except requests.RequestException as e:
                logger.error(f"Erro ao buscar itens {status} por SKU {sku}: {e}")
                continue
        
        # Remover duplicatas
        unique_items = []
        seen_ids = set()
        for item in all_found_items:
            item_id = item.get('id')
            if item_id and item_id not in seen_ids:
                seen_ids.add(item_id)
                unique_items.append(item)
        
        logger.info(f"Total único em todos os status: {len(unique_items)} itens com SKU {sku}")
        return unique_items
    
    @staticmethod
    def _ensure_valid_token(account):
        """
        Verificação de token válido
        """
        try:
            from app_mercado_livre.utils import ensure_valid_token
            return ensure_valid_token(account)
        except ImportError:
            return hasattr(account, 'access_token') and account.access_token
    
    @staticmethod
    def search_multiple_skus_optimized(account, skus_list):
        """
        Busca múltiplos SKUs de forma otimizada usando filtros
        """
        logger.info(f"[search_multiple_skus_optimized] Conta {account.account_id} | {len(skus_list)} SKUs")
        
        if not MercadoLivreSKUServiceOtimizado._ensure_valid_token(account):
            logger.warning("Token inválido / expirado.")
            return {}
        
        results = {}
        headers = {"Authorization": f"Bearer {account.access_token}"}
        
        # Buscar todos os SKUs em uma única query (se possível)
        all_skus_query = " OR ".join(skus_list)
        
        try:
            url = f"https://api.mercadolibre.com/users/{account.account_id}/items/search"
            params = {
                'q': all_skus_query,
                'status': 'active',
                'limit': 50
            }
            
            response = requests.get(url, headers=headers, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            item_ids = data.get("results", [])
            
            if item_ids:
                detailed_items = MercadoLivreSKUServiceOtimizado._get_items_details_batch(
                    item_ids, headers
                )
                
                # Organizar resultados por SKU
                for sku in skus_list:
                    results[sku] = []
                    for item in detailed_items:
                        if MercadoLivreSKUServiceOtimizado._item_contains_sku(item, sku):
                            results[sku].append(item)
                    
                    logger.info(f"SKU {sku}: {len(results[sku])} itens encontrados")
            else:
                # Se a query combinada não funcionar, buscar individualmente
                for sku in skus_list:
                    results[sku] = MercadoLivreSKUServiceOtimizado.search_items_by_sku_ultra_otimizado(
                        account, sku
                    )
        
        except requests.RequestException as e:
            logger.error(f"Erro na busca múltipla otimizada: {e}")
            # Fallback: buscar individualmente
            for sku in skus_list:
                try:
                    results[sku] = MercadoLivreSKUServiceOtimizado.search_items_by_sku_ultra_otimizado(
                        account, sku
                    )
                except Exception as sku_error:
                    logger.error(f"Erro ao buscar SKU {sku}: {sku_error}")
                    results[sku] = []
        
        return results