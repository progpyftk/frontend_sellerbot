# Serviço de Busca por SKU - MercadoLivre

## Problema Identificado

O método original `search_items_by_sku` estava usando uma abordagem incorreta da API do MercadoLivre:

```python
# ❌ INCORRETO - Esta busca não funciona
url = (
    f"https://api.mercadolibre.com/sites/MLB/search"
    f"?seller_id={account.account_id}&seller_custom_field={sku}"
)
```

**Por que não funciona:**
- O endpoint `/sites/MLB/search` é para buscas públicas
- Não aceita o parâmetro `seller_custom_field` desta forma
- Retorna erro 403 (Forbidden) quando tentamos usar

## Solução Implementada

O novo serviço `MercadoLivreSKUService` usa a abordagem correta:

1. **Busca todos os itens do usuário** usando `/users/{user_id}/items/search`
2. **Obtém detalhes em lotes** usando `/items?ids=id1,id2,id3...`
3. **Verifica SKU em múltiplos locais**:
   - `seller_custom_field` principal
   - `seller_custom_field` das variações
   - Atributos `SELLER_SKU` das variações

## Como Usar

### 1. Busca Básica por SKU

```python
from mercado_livre_sku_service import MercadoLivreSKUService

# Buscar itens por SKU
items = MercadoLivreSKUService.search_items_by_sku_optimized(account, "CPIN-P-3L")

print(f"Encontrados {len(items)} itens")
for item in items:
    print(f"- {item['id']}: {item['title']}")
```

### 2. Substituir Método Existente

```python
# No seu arquivo items.py existente, substitua:
@staticmethod
def search_items_by_sku(account, sku):
    """MÉTODO CORRIGIDO"""
    return MercadoLivreSKUService.search_items_by_sku_optimized(account, sku)
```

### 3. Buscar em Múltiplos Status

```python
# Buscar em itens ativos, pausados e fechados
items = MercadoLivreItemService.search_items_by_sku_all_statuses(account, sku)
```

### 4. Buscar Múltiplos SKUs

```python
skus = ["SKU1", "SKU2", "SKU3"]
results = MercadoLivreSKUService.search_items_by_multiple_skus(account, skus)

for sku, items in results.items():
    print(f"SKU {sku}: {len(items)} itens")
```

## Funcionalidades Extras

### Utilitários SKU

```python
from exemplo_integracao_sku_service import SKUUtils

# Normalizar SKU
sku_limpo = SKUUtils.normalize_sku("  cpin-p-3l  ")  # → "CPIN-P-3L"

# Extrair todos os SKUs de um item
skus = SKUUtils.extract_all_skus_from_item(item_data)

# Encontrar SKUs duplicados
duplicates = SKUUtils.find_items_with_duplicate_skus(account)
```

## Estrutura dos Dados Retornados

O serviço retorna os dados completos do item, incluindo:

```json
{
  "id": "MLB123456789",
  "title": "Título do produto",
  "seller_custom_field": "CPIN-P-3L",
  "status": "active",
  "price": 99.99,
  "available_quantity": 10,
  "variations": [
    {
      "id": 123456,
      "seller_custom_field": "CPIN-P-3L-VAR1",
      "attributes": [...]
    }
  ],
  // ... outros campos da API
}
```

## Performance e Otimizações

### Busca Otimizada
- Usa lotes de 20 itens por requisição (limite da API)
- Processa apenas itens ativos por padrão
- Implementa timeout de 30 segundos
- Log detalhado para debugging

### Comparação de Performance

| Método | Requisições | Tempo Estimado |
|--------|-------------|----------------|
| Original (quebrado) | 1 + N | N/A (erro 403) |
| Novo Básico | 1 + N | Alto |
| Novo Otimizado | 1 + N/20 | **Muito Melhor** |

## Tratamento de Erros

O serviço inclui tratamento robusto de erros:

```python
try:
    items = MercadoLivreSKUService.search_items_by_sku_optimized(account, sku)
except Exception as e:
    logger.error(f"Erro na busca: {e}")
    items = []
```

## Logs e Debugging

O serviço gera logs detalhados:

```
INFO [search_items_by_sku_optimized] Conta 1779019381 | SKU=CPIN-P-3L
INFO Total de 150 itens encontrados para a conta 1779019381
INFO SKU CPIN-P-3L encontrado no item MLB123456789
INFO Busca otimizada concluída: 3 itens com SKU CPIN-P-3L
```

## Integração com Views

### Django/FastAPI Example

```python
from django.http import JsonResponse
from .services import MercadoLivreItemService

def buscar_anuncios_por_sku(request):
    sku = request.GET.get('sku')
    user = request.user
    
    # Buscar em todas as contas do usuário
    view = AnunciosPorSkuView()
    results = view.get_anuncios_by_sku(user, sku)
    
    return JsonResponse(results)
```

## Possíveis Melhorias Futuras

1. **Cache**: Implementar cache Redis para resultados
2. **Async**: Versão assíncrona para melhor performance
3. **Filtros**: Adicionar filtros por categoria, preço, etc.
4. **Bulk Operations**: Operações em lote para múltiplas contas

## Troubleshooting

### Erro 403 Forbidden
- Verifique se o token está válido
- Confirme se a conta tem permissões adequadas

### Performance Lenta
- Use a versão otimizada (`search_items_by_sku_optimized`)
- Considere filtrar por status se não precisar de todos

### SKU não encontrado
- Verifique se o SKU está exatamente igual (case-insensitive)
- Confirme se está em `seller_custom_field` ou variações
- Use os logs para debug

## Migração do Código Antigo

Para migrar do código antigo:

1. Substitua a importação:
```python
# Antigo
from .services.items import MercadoLivreItemService

# Novo (adicione)
from mercado_livre_sku_service import MercadoLivreSKUService
```

2. Substitua o método:
```python
# Antigo (quebrado)
items = MercadoLivreItemService.search_items_by_sku(account, sku)

# Novo (funcionando)
items = MercadoLivreSKUService.search_items_by_sku_optimized(account, sku)
```

3. Teste com um SKU conhecido para validar