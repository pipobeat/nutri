# Dados nutricionais embutidos no app

## TACO — composição dos alimentos (`taco.json`)
**TACO — Tabela Brasileira de Composição de Alimentos**, 4ª ed. revisada e ampliada. NEPA/UNICAMP, Campinas, 2011.
597 alimentos, valores por 100 g de parte comestível. A publicação permite "a reprodução total ou parcial do material, desde que seja citada a fonte".

## Medidas caseiras (`household.json`)
**IBGE — Pesquisa de Orçamentos Familiares 2008-2009**: *Tabela de Medidas Referidas para os Alimentos Consumidos no Brasil* (Rio de Janeiro, 2011). Gramas por medida caseira (colher de sopa, concha, unidade…) para 204 alimentos da TACO. IBGE permite o reuso com citação da fonte.

## Processamento
- CSVs processados da TACO e da POF: projeto [brolesi/taco](https://github.com/brolesi/taco) (código MIT), commit `b800c910dfc9d2e8e6bab45dd42e5b8f5167b466`.
- Conversão para JSON, conferência célula a célula contra a planilha oficial do NEPA e mapeamento TACO → POF (204 alimentos): projeto [taco-br-mcp](https://www.npmjs.com/package/taco-br-mcp) v0.2.0 (MIT). Nesta conversão, "Tr" (traços) aparece como `{"trace": true}` e células vazias como `null`.
- Os arquivos aqui foram extraídos do pacote `taco-br-mcp@0.2.0` (npm) sem alteração dos valores. `scripts/build-taco.mjs` gera `src/data/taco.gen.json`, a versão compacta usada pelo app.

Erros de mapeamento são dos projetos de processamento, não do NEPA ou do IBGE. Não é orientação médica ou nutricional.
