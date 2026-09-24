import requests
from backend_sellerbot.settings import get_logger

logger = get_logger("app_mercado_livre_sku_service")


class MercadoLivreSKUService:
    
    @staticmethod
    def search_items_by_sku(account, sku):
        """
        Busca anúncios por SKU em seller_custom_field e nas variações.
        
        :param account: Conta do MercadoLivre autenticada
        :param sku: SKU a ser buscado
        :return: Lista de itens completos que possuem o SKU
        """
        logger.info(f"[search_items_by_sku] Conta {account.account_id} | SKU={sku}")
        
        # Verificar se o token é válido (assumindo que você tem essa função)
        if not MercadoLivreSKUService._ensure_valid_token(account):
            logger.warning("Token inválido / expirado.")
            return []
        
        found_items = []
        
        try:
            # 1. Buscar todos os anúncios ativos da conta
            all_items = MercadoLivreSKUService._get_all_user_items(account)
            
            # 2. Para cada item, verificar se contém o SKU
            for item_id in all_items:
                item_details = MercadoLivreSKUService._get_item_details(account, item_id)
                if item_details and MercadoLivreSKUService._item_contains_sku(item_details, sku):
                    found_items.append(item_details)
                    logger.info(f"SKU {sku} encontrado no item {item_id}")
            
            logger.info(f"Encontrados {len(found_items)} itens com SKU {sku}")
            return found_items
            
        except requests.RequestException as e:
            logger.error(f"Erro ao buscar itens por SKU {sku}: {e}")
            return []
    
    @staticmethod
    def _get_all_user_items(account, status="active"):
        """
        Obtém todos os IDs dos itens do usuário.
        
        :param account: Conta autenticada
        :param status: Status dos itens (active, paused, closed, etc.)
        :return: Lista de IDs dos itens
        """
        all_items = []
        offset = 0
        limit = 50
        
        headers = {"Authorization": f"Bearer {account.access_token}"}
        
        while True:
            url = f"https://api.mercadolibre.com/users/{account.account_id}/items/search"
            params = {
                "status": status,
                "offset": offset,
                "limit": limit
            }
            
            try:
                response = requests.get(url, headers=headers, params=params, timeout=30)
                response.raise_for_status()
                
                data = response.json()
                results = data.get("results", [])
                
                if not results:
                    break
                
                all_items.extend(results)
                offset += limit
                
                # Se retornou menos que o limit, chegamos ao fim
                if len(results) < limit:
                    break
                    
            except requests.RequestException as e:
                logger.error(f"Erro ao buscar itens do usuário: {e}")
                break
        
        logger.info(f"Total de {len(all_items)} itens encontrados para a conta {account.account_id}")
        return all_items
    
    @staticmethod
    def _get_item_details(account, item_id):
        """
        Obtém os detalhes completos de um item.
        
        :param account: Conta autenticada
        :param item_id: ID do item
        :return: Detalhes do item ou None se houver erro
        """
        headers = {"Authorization": f"Bearer {account.access_token}"}
        url = f"https://api.mercadolibre.com/items/{item_id}"
        
        try:
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            return response.json()
            
        except requests.RequestException as e:
            logger.error(f"Erro ao obter detalhes do item {item_id}: {e}")
            return None
    
    @staticmethod
    def _item_contains_sku(item_data, sku):
        """
        Verifica se um item contém o SKU especificado.
        Busca no seller_custom_field e nas variações.
        
        :param item_data: Dados completos do item
        :param sku: SKU a ser buscado
        :return: True se o SKU for encontrado, False caso contrário
        """
        # 1. Verificar no seller_custom_field principal
        seller_custom_field = item_data.get("seller_custom_field")
        if seller_custom_field and seller_custom_field.strip().upper() == sku.strip().upper():
            logger.info(f"SKU {sku} encontrado no seller_custom_field principal")
            return True
        
        # 2. Verificar nas variações
        variations = item_data.get("variations", [])
        for variation in variations:
            # Verificar seller_custom_field da variação
            var_custom_field = variation.get("seller_custom_field")
            if var_custom_field and var_custom_field.strip().upper() == sku.strip().upper():
                logger.info(f"SKU {sku} encontrado na variação {variation.get('id')}")
                return True
            
            # Verificar attributes da variação (caso o SKU esteja em algum atributo)
            attributes = variation.get("attributes", [])
            for attr in attributes:
                if attr.get("id") == "SELLER_SKU" and attr.get("value_name"):
                    if attr.get("value_name").strip().upper() == sku.strip().upper():
                        logger.info(f"SKU {sku} encontrado no atributo SELLER_SKU da variação")
                        return True
        
        return False
    
    @staticmethod
    def search_items_by_multiple_skus(account, skus_list):
        """
        Busca anúncios por múltiplos SKUs de uma vez.
        
        :param account: Conta autenticada
        :param skus_list: Lista de SKUs para buscar
        :return: Dicionário com SKU como chave e lista de itens como valor
        """
        logger.info(f"[search_items_by_multiple_skus] Conta {account.account_id} | SKUs={skus_list}")
        
        if not MercadoLivreSKUService._ensure_valid_token(account):
            logger.warning("Token inválido / expirado.")
            return {}
        
        results = {}
        
        try:
            # Buscar todos os itens uma vez
            all_items = MercadoLivreSKUService._get_all_user_items(account)
            
            # Para cada SKU, verificar em todos os itens
            for sku in skus_list:
                results[sku] = []
                
                for item_id in all_items:
                    item_details = MercadoLivreSKUService._get_item_details(account, item_id)
                    if item_details and MercadoLivreSKUService._item_contains_sku(item_details, sku):
                        results[sku].append(item_details)
                
                logger.info(f"SKU {sku}: {len(results[sku])} itens encontrados")
            
            return results
            
        except requests.RequestException as e:
            logger.error(f"Erro ao buscar itens por múltiplos SKUs: {e}")
            return {}
    
    @staticmethod
    def get_sku_from_item(item_data):
        """
        Extrai o SKU de um item (útil para operações inversas).
        
        :param item_data: Dados do item
        :return: SKU principal ou None
        """
        # Primeiro tenta o seller_custom_field principal
        main_sku = item_data.get("seller_custom_field")
        if main_sku:
            return main_sku.strip()
        
        # Se não encontrar, tenta a primeira variação
        variations = item_data.get("variations", [])
        for variation in variations:
            var_sku = variation.get("seller_custom_field")
            if var_sku:
                return var_sku.strip()
        
        return None
    
    @staticmethod
    def _ensure_valid_token(account):
        """
        Placeholder para verificação de token válido.
        Substitua pela sua implementação real.
        """
        # Assumindo que você tem uma função similar no seu projeto
        try:
            from app_mercado_livre.utils import ensure_valid_token
            return ensure_valid_token(account)
        except ImportError:
            # Implementação básica se não tiver a função
            return hasattr(account, 'access_token') and account.access_token
    
    @staticmethod
    def search_items_by_sku_optimized(account, sku):
        """
        Versão otimizada que busca por lotes para melhor performance.
        
        :param account: Conta autenticada
        :param sku: SKU a ser buscado
        :return: Lista de itens que contém o SKU
        """
        logger.info(f"[search_items_by_sku_optimized] Conta {account.account_id} | SKU={sku}")
        
        if not MercadoLivreSKUService._ensure_valid_token(account):
            logger.warning("Token inválido / expirado.")
            return []
        
        found_items = []
        
        try:
            # Buscar IDs dos itens
            item_ids = MercadoLivreSKUService._get_all_user_items(account)
            
            # Buscar detalhes em lotes de 20 (limite da API)
            batch_size = 20
            headers = {"Authorization": f"Bearer {account.access_token}"}
            
            for i in range(0, len(item_ids), batch_size):
                batch = item_ids[i:i + batch_size]
                ids_param = ",".join(batch)
                
                url = f"https://api.mercadolibre.com/items?ids={ids_param}"
                
                try:
                    response = requests.get(url, headers=headers, timeout=30)
                    response.raise_for_status()
                    
                    batch_results = response.json()
                    
                    for result in batch_results:
                        if result.get("code") == 200:  # Item encontrado com sucesso
                            item_data = result.get("body")
                            if item_data and MercadoLivreSKUService._item_contains_sku(item_data, sku):
                                found_items.append(item_data)
                                logger.info(f"SKU {sku} encontrado no item {item_data.get('id')}")
                
                except requests.RequestException as e:
                    logger.error(f"Erro ao buscar lote de itens: {e}")
                    continue
            
            logger.info(f"Busca otimizada concluída: {len(found_items)} itens com SKU {sku}")
            return found_items
            
        except requests.RequestException as e:
            logger.error(f"Erro na busca otimizada por SKU {sku}: {e}")
            return []