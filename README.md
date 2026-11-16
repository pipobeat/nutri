# Nutri — acompanhamento pessoal de nutrição

App web (PWA) pessoal para acompanhar alimentação, cardápio semanal, macros, água, lista de compras, peso, treinos e nutrientes de uma alimentação pescetariana com frango ocasional (peito grelhado). Carne bovina, suína e outras carnes terrestres são bloqueadas; frango pode ser desligado em Ajustes. Feito para ser instalado na Tela de Início do iPhone.

**Stack:** React 18 · TypeScript · Tailwind CSS · Framer Motion (animações) · Recharts (gráficos) · Lucide (ícones) · Zustand (estado + persistência).

## Rodando

**App publicado:** https://pipobeat.github.io/nutri/

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # verificações de cálculo, restrições e lista de compras + relatório do cardápio
npm run build      # gera dist/ (PWA) para hospedar em qualquer servidor estático
npm run build:single  # gera dist-single/index.html (arquivo único, sem service worker)
```

## Instalar no iPhone

1. A cada push na `main`, o workflow `.github/workflows/pages.yml` testa, gera `dist/` e publica no GitHub Pages (*Settings → Pages → Source: GitHub Actions*).
2. Abra o endereço no **Safari** → Compartilhar → **Adicionar à Tela de Início**.
3. O app abre em tela cheia, funciona offline (service worker) e guarda os dados no aparelho.

## Onde ficam os dados

- Tudo é salvo automaticamente no `localStorage` do navegador, na chave `nutri-pessoal:v1` (perfil, metas, cardápio, registros, água, peso, treinos, suplementos, lista de compras).
- Nada é enviado para servidores. Em **Ajustes → Seus dados** há backup/importação em JSON e exportação dos registros em CSV.
- Para migrar para um backend no futuro, basta implementar a interface de `src/store/storage.ts` (getItem/setItem/removeItem) chamando uma API/Supabase/Firebase; o restante do app não muda.

## Base offline: TACO completa + medidas caseiras do IBGE

O app traz embutida a **TACO inteira** (591 alimentos com energia, macros, fibras e micronutrientes — cálcio, ferro, zinco, sódio, magnésio, potássio, vitamina C) e as **medidas caseiras do IBGE** (POF 2008-2009: colher de sopa, concha, escumadeira, unidade… para 204 alimentos). Funciona sem internet.

- Fontes, licenças e processamento: [`data/taco/NOTICE.md`](data/taco/NOTICE.md). Os dados vieram do pacote `taco-br-mcp@0.2.0` (MIT), que converte os CSVs do projeto `brolesi/taco` e os conferiu célula a célula com a planilha oficial do NEPA.
- `npm run taco` (ou `node scripts/build-taco.mjs`) regenera `src/data/taco.gen.json` (~20 KB gzip).
- A busca encontra qualquer item da TACO; ao ser usado, o alimento entra na sua base pessoal. Carnes bovina/suína ficam fora da busca (frango conforme Ajustes).
- O cálculo offline de pratos usa a TACO inteira (inclusive pratos prontos como baião de dois, estrogonofe de frango, cuscuz paulista) e converte medidas caseiras com os gramas do IBGE para cada alimento ("2 conchas de feijão" = 280 g).
- A tela Nutrientes estima ferro, zinco, cálcio, magnésio, vitamina C e sódio a partir dos registros, com a cobertura dos dados. B12, vitamina D e ômega-3 não existem na TACO e seguem só como fontes.
- A conferência com a TACO oficial mostrou que o leite fluido não tem macronutrientes na tabela; esses dois itens da base passaram a citar a USDA.

## Base nutricional

`src/data/foods.ts` — valores por 100 g/ml, cada item com fonte e descrição exata:

| Selo | Fonte |
|---|---|
| TACO | Tabela Brasileira de Composição de Alimentos, 4ª ed. (NEPA/UNICAMP) |
| USDA | FoodData Central (SR Legacy), usado só quando a TACO não traz o item (tilápia, cottage, grão-de-bico cozido, chia, atum em água, macarrão integral, pasta de amendoim, purê, molho de tomate) |
| Rótulo ≈ | média de rótulos (iogurte proteico, whey, tapioca) — edite com o rótulo da sua marca |
| Estimado ≈ | composição calculada a partir de itens da TACO (salada de folhas, mix de legumes) |

Os valores foram transcritos e devem ser conferidos com as tabelas oficiais; qualquer alimento pode ser editado no app (e restaurado ao original). Ovos mexidos/omelete usam o ovo cru da TACO, sem o óleo do preparo. Pesos do cardápio são de alimentos prontos; a lista de compras converte grãos para peso seco e peixes para peso cru (aproximações sinalizadas).

Quarta e domingo agora têm jantar com peito de frango grelhado, e a aba Salvas traz 5 pratos com frango prontos para registrar. Quem já usava o app recebe essas mudanças automaticamente (jantares só são trocados se ainda estiverem como no plano original).

O cardápio inicial, calculado com essa base, fica entre ~1.680 e ~1.990 kcal/dia (abaixo da meta de 2.200, com carboidratos ~165–200 g). O app mostra essa diferença por dia e oferece **Sugerir ajuste** (escala carboidratos e frutas, com prévia), sem alterar nada automaticamente.

## Calcular um prato descrito em texto (aba "✦ Prato")

Em **Registrar → Prato**, escreva o que comeu ("peito de frango grelhado com macarrão ao molho Alfredo") e toque em **Calcular**:

- **Offline** (`src/lib/dish.ts`): separa o texto em ingredientes, reconhece cada um na base (regras para ~80 alimentos, medidas caseiras como concha, escumadeira e colher), usa porções típicas quando você não diz a quantidade e mostra a confiança da estimativa. Itens não reconhecidos podem ser associados a um alimento da base com um toque.
- **Com IA** (`src/lib/aiDish.ts`, opcional): usa o Claude (`claude-opus-5-5`, esforço baixo, saída em JSON estruturado) pela API da Anthropic, direto do navegador, com a sua chave (Ajustes → Cálculo de pratos com IA). A chave fica só no aparelho, fora do backup. Ingredientes que existem na base são recalculados com os valores TACO/USDA do app; o restante fica marcado "IA ≈".

O resultado mostra kcal total e por 100 g, macros, fibras, % das metas, destaques nutricionais e cada ingrediente com gramas editáveis. Dá para registrar como uma porção (marcada como estimativa) e salvar o prato na base para reutilizar.

## Busca de produtos e marcas (Open Food Facts)

Na tela **Registrar → Marcas** dá para buscar qualquer produto industrializado, lanche ou bebida por nome, marca ou código de barras. Os dados vêm do [Open Food Facts](https://world.openfoodfacts.org) (base aberta, sem chave de API, com dados de rótulo enviados por colaboradores — por isso sempre sinalizados como "OFF" e com aviso para conferir a embalagem). Produtos vendidos no Brasil aparecem primeiro.

Para cada produto o app mostra: kcal por 100 g/ml e por porção, % da sua meta de calorias e proteína, tabela completa (açúcares, gordura saturada, fibras, sódio), Nutri-Score, grupo NOVA e um **perfil nutricional** indicativo (fonte/rico em proteína e fibras pelos critérios da UE 1924/2006; alto em gordura, saturada, açúcares e sódio pelo semáforo da FSA; densidade calórica). Ao registrar, o produto é salvo na base local e passa a aparecer na busca normal, inclusive offline. Integração em `src/lib/openfoodfacts.ts`.

## Estrutura

```
src/
  data/        foods.ts (base), initialPlan.ts (cardápio), nutrients.ts (conteúdo educativo)
  lib/         nutrition.ts (cálculos, BMR, MET, restrições), shopping.ts, dates.ts, format.ts
  store/       useStore.ts (estado persistido), storage.ts (adaptador), ui.ts (navegação)
  components/  NutritionProgress, MealCard, FoodSearch, QtySheet, SwapSheet, FoodForm, EntrySheet, ui/
  pages/       Dashboard, WeeklyMenu, FoodLog, ShoppingList, WeightTracker, ExerciseTracker, Nutrients, Settings, History, Foods, More
```

## Limitações conhecidas

- **Notificações com o app fechado** exigiriam um servidor de Web Push; os lembretes funcionam com o app aberto/recente.
- **Micronutrientes**: ferro, zinco, cálcio, magnésio, vitamina C e sódio são estimados só para alimentos da TACO; B12, vitamina D e ômega-3 não têm dados (a TACO não os traz).
- A IA precisa de internet e de uma chave paga da API da Anthropic; sem ela, o cálculo offline cobre os alimentos da base.
- **Sincronização entre aparelhos** não existe (dados locais); use backup/importação.
- A TACO não tem API oficial: alimentos in natura vêm da base local; produtos e marcas vêm do Open Food Facts (requer internet; pratos de restaurante sem marca geralmente não estão lá — use o registro Rápido).
- Leitura do código de barras pela câmera não foi incluída (o Safari do iPhone não oferece leitor nativo); digite os números do código.
