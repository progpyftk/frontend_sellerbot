# Exemplo de como integrar o novo serviço SKU no seu código existente

from mercado_livre_sku_service import MercadoLivreSKUService
from backend_sellerbot.settings import get_logger

logger = get_logger("app_mercado_livre_integration")


class MercadoLivreItemService:
    """
    Sua classe existente - apenas substituindo o método problemático
    """
    
    @staticmethod
    def search_items_by_sku(account, sku):
        """
        MÉTODO CORRIGIDO - Agora usa a abordagem correta da API
        
        Retorna uma lista de itens (corpos completos) da conta cujo
        seller_custom_field seja igual ao SKU informado OU que tenha
        o SKU em alguma variação.
        """
        logger.info(f"[search_items_by_sku] Conta {account.account_id} | SKU={sku}")
        
        # Usar o novo serviço otimizado
        return MercadoLivreSKUService.search_items_by_sku_optimized(account, sku)
    
    @staticmethod
    def search_items_by_sku_all_statuses(account, sku):
        """
        NOVO MÉTODO - Busca SKU em itens de todos os status (ativo, pausado, fechado)
        """
        logger.info(f"[search_items_by_sku_all_statuses] Conta {account.account_id} | SKU={sku}")
        
        all_found_items = []
        statuses = ["active", "paused", "closed"]
        
        for status in statuses:
            found_items = []
            
            try:
                # Buscar itens por status
                item_ids = MercadoLivreSKUService._get_all_user_items(account, status=status)
                
                # Buscar detalhes em lotes
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
                            if result.get("code") == 200:
                                item_data = result.get("body")
                                if item_data and MercadoLivreSKUService._item_contains_sku(item_data, sku):
                                    # Adicionar status para identificação
                                    item_data["_search_status"] = status
                                    found_items.append(item_data)
                    
                    except requests.RequestException as e:
                        logger.error(f"Erro ao buscar lote de itens {status}: {e}")
                        continue
                
                logger.info(f"Status {status}: {len(found_items)} itens com SKU {sku}")
                all_found_items.extend(found_items)
                
            except Exception as e:
                logger.error(f"Erro ao buscar itens {status} por SKU {sku}: {e}")
                continue
        
        logger.info(f"Total encontrado: {len(all_found_items)} itens com SKU {sku}")
        return all_found_items


# Exemplo de uso em uma view Django/FastAPI
class AnunciosPorSkuView:
    """
    Exemplo de como usar em uma view
    """
    
    def get_anuncios_by_sku(self, user, sku):
        """
        Busca anúncios por SKU para todas as contas do usuário
        """
        logger.info(f"[AnunciosPorSku] user={user.username} SKU={sku}")
        
        # Assumindo que você tem um modelo de contas do usuário
        accounts = user.mercadolivre_accounts.all()  # ou como você obtém as contas
        
        all_results = []
        
        for account in accounts:
            try:
                # Usar o método corrigido
                items = MercadoLivreItemService.search_items_by_sku(account, sku)
                
                # Adicionar informação da conta para cada item
                for item in items:
                    item["_account_id"] = account.account_id
                    item["_account_nickname"] = getattr(account, 'nickname', 'N/A')
                
                all_results.extend(items)
                
            except Exception as e:
                logger.error(f"Erro ao buscar SKU {sku} na conta {account.account_id}: {e}")
                continue
        
        return {
            "sku": sku,
            "total_items": len(all_results),
            "items": all_results
        }


# Exemplo de uso direto
if __name__ == "__main__":
    # Exemplo de teste (substitua pelos seus dados reais)
    class MockAccount:
        def __init__(self, account_id, access_token):
            self.account_id = account_id
            self.access_token = access_token
    
    # Teste básico
    account = MockAccount("1779019381", "seu_token_aqui")
    sku = "CPIN-P-3L"
    
    # Buscar usando o novo serviço
    results = MercadoLivreSKUService.search_items_by_sku_optimized(account, sku)
    
    print(f"Encontrados {len(results)} itens com SKU {sku}")
    for item in results:
        print(f"- Item: {item.get('id')} - {item.get('title')}")
        print(f"  SKU principal: {item.get('seller_custom_field')}")
        
        # Mostrar SKUs das variações se houver
        variations = item.get('variations', [])
        if variations:
            print("  Variações:")
            for var in variations:
                var_sku = var.get('seller_custom_field')
                if var_sku:
                    print(f"    - Variação {var.get('id')}: SKU={var_sku}")


# Utilitários extras
class SKUUtils:
    """
    Utilitários para trabalhar com SKUs
    """
    
    @staticmethod
    def normalize_sku(sku):
        """
        Normaliza um SKU removendo espaços e convertendo para maiúscula
        """
        return sku.strip().upper() if sku else ""
    
    @staticmethod
    def extract_all_skus_from_item(item_data):
        """
        Extrai todos os SKUs de um item (principal + variações)
        """
        skus = []
        
        # SKU principal
        main_sku = item_data.get("seller_custom_field")
        if main_sku:
            skus.append(SKUUtils.normalize_sku(main_sku))
        
        # SKUs das variações
        variations = item_data.get("variations", [])
        for variation in variations:
            var_sku = variation.get("seller_custom_field")
            if var_sku:
                skus.append(SKUUtils.normalize_sku(var_sku))
        
        return list(set(skus))  # Remove duplicatas
    
    @staticmethod
    def find_items_with_duplicate_skus(account):
        """
        Encontra itens que compartilham o mesmo SKU (útil para limpeza)
        """
        logger.info(f"Buscando SKUs duplicados na conta {account.account_id}")
        
        # Buscar todos os itens
        item_ids = MercadoLivreSKUService._get_all_user_items(account)
        
        sku_to_items = {}
        
        # Processar em lotes
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
                    if result.get("code") == 200:
                        item_data = result.get("body")
                        if item_data:
                            skus = SKUUtils.extract_all_skus_from_item(item_data)
                            
                            for sku in skus:
                                if sku not in sku_to_items:
                                    sku_to_items[sku] = []
                                sku_to_items[sku].append({
                                    "id": item_data.get("id"),
                                    "title": item_data.get("title"),
                                    "status": item_data.get("status")
                                })
            
            except requests.RequestException as e:
                logger.error(f"Erro ao processar lote: {e}")
                continue
        
        # Encontrar duplicatas
        duplicates = {sku: items for sku, items in sku_to_items.items() if len(items) > 1}
        
        logger.info(f"Encontrados {len(duplicates)} SKUs duplicados")
        return duplicates