# Guardrails de Custo - Supabase Pro

## Limites do plano Pro
- Egress mensal: 250 GB
- Cached egress mensal: 250 GB

## Meta segura recomendada
- Trabalhar com 70% do limite para evitar estouro no fim do ciclo.
- Meta mensal egress: 175 GB
- Meta mensal cached egress: 175 GB

## Medias para operar com seguranca
Considerando ciclo de 30 dias:
- Egress medio diario seguro: 5.83 GB por dia
- Cached egress medio diario seguro: 5.83 GB por dia

Considerando ciclo de 4.3 semanas por mes:
- Egress medio semanal seguro: 40.7 GB por semana
- Cached egress medio semanal seguro: 40.7 GB por semana

## Gatilhos de alerta
- Alerta amarelo: 70% da meta segura
- Alerta vermelho: 90% da meta segura

Valores de referencia:
- Amarelo mensal: 122.5 GB
- Vermelho mensal: 157.5 GB

## Politica operacional
1. Toda listagem deve usar thumbnail ou transformacao pequena.
2. Imagem original deve ser servida apenas para download de compra.
3. Evitar renderizar imagem grande em grids e cards.
4. Revisar semanalmente egress e cached egress no dashboard do Supabase.
5. Se o ritmo semanal ultrapassar 40.7 GB, reduzir qualidade e largura de preview na mesma semana.

## Plano de contingencia rapido
Se projetar estouro no mes atual:
1. Reduzir imediatamente qualidade de thumbnail e medium em 10 a 15 pontos.
2. Reduzir largura de thumbnail para 180 a 200 px.
3. Priorizar cache local em telas de galeria e dashboard.
4. Congelar novos pontos de carregamento de imagens grandes ate estabilizar.

## Observacao importante
Cached egress alto normalmente indica muito trafego de imagem publica. Foque primeiro em:
- transformacao nativa de imagem
- tamanho de preview
- evitar fallback para URL original em telas de listagem
