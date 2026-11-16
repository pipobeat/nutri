// Verificações de cálculo e restrições: `npm test`
import { BASE_FOODS } from '../src/data/foods';
import { buildInitialPlan } from '../src/data/initialPlan';
import { dayMacros, kcalFromMacros, mealMacros, scale, violatesDiet, bmr, tdee } from '../src/lib/nutrition';
import { buildShopping } from '../src/lib/shopping';
import { parseNum } from '../src/lib/format';
import { estimateLocal, dishTotals, dishMicro } from '../src/lib/dish';
import { TACO_FOODS, enrichWithTaco } from '../src/data/taco';
import { parseProduct, highlights, productToFood } from '../src/lib/openfoodfacts';

let fail = 0;
const ok = (cond: boolean, msg: string) => { if (!cond) { fail++; console.error('✗', msg); } };
const foods = Object.fromEntries(BASE_FOODS.map((f) => [f.id, f]));
const plan = buildInitialPlan();

// 1. todos os itens do plano existem na base
plan.forEach((d, di) => d.forEach((m) => m.items.forEach((i) => ok(!!foods[i.foodId], `dia ${di} ${m.type}: alimento ${i.foodId} inexistente`))));
// 2. nenhuma carne terrestre na base
BASE_FOODS.forEach((f) => ok(!violatesDiet(f.name), `alimento viola dieta: ${f.name}`));
ok(!violatesDiet('Peito de frango grelhado'), 'frango liberado por padrão');
ok(!!violatesDiet('Peito de frango grelhado', [], false), 'frango bloqueado quando desativado');
ok(!violatesDiet('Lombo de bacalhau') && !violatesDiet('Carne de siri'), 'frutos do mar não bloqueados');
ok(!!violatesDiet('Carne moída'), 'bloqueio de carne');
ok(!violatesDiet('Ovo de galinha'), 'ovo não pode ser bloqueado');
// 3. coerência kcal x macros (4/4/9) em cada alimento — tolerância 20% (fibra/álcool/arredondamentos)
BASE_FOODS.forEach((f) => {
  const k = kcalFromMacros(f.per100);
  // exceções legítimas: álcool (cerveja) e ácidos orgânicos (limão) não entram no 4/4/9
  if (f.per100.kcal > 30 && !['cerveja', 'limao'].includes(f.id)) ok(Math.abs(k - f.per100.kcal) / f.per100.kcal < 0.2, `${f.name}: ${f.per100.kcal} kcal vs ${k.toFixed(0)} pelos macros`);
});
// 4. escala linear
const s = scale(foods.arroz_integral.per100, 150);
ok(Math.abs(s.kcal - 186) < 0.01 && Math.abs(s.p - 3.9) < 0.01, 'arroz integral 150 g = 186 kcal / 3,9 g P');
// 5. soma refeição = soma itens
const seg = plan[0];
const manual = seg.flatMap((m) => m.items).reduce((a, i) => a + foods[i.foodId].per100.kcal * i.qty / 100, 0);
ok(Math.abs(dayMacros(foods, seg).kcal - manual) < 1e-6, 'total do dia = soma dos itens');
// 6. BMR do perfil inicial ≈ 1.748
const prof = { name: '', sex: 'm' as const, age: 25, height: 174, weight: 78, activity: '', activityFactor: 1.5, goal: '', diet: '', budget: '' };
ok(Math.round(bmr(prof)) === 1748, `BMR ${bmr(prof)}`);
ok(Math.round(tdee(prof)) === 2621, `TDEE ${tdee(prof)}`);
// 7. parse pt-BR
ok(parseNum('78,5') === 78.5 && parseNum('1.250,5') === 1250.5 && parseNum('80') === 80 && Number.isNaN(parseNum('abc')), 'parseNum');
// 8. lista de compras: sem duplicação e reage a mudanças
const shop = buildShopping(plan, foods);
ok(new Set(shop.map((l) => l.key)).size === shop.length, 'lista sem duplicados');
const ovos = shop.find((l) => l.key === 'Ovos')!;
const plan2 = structuredClone(plan); plan2[0][0].items[0].qty = 150;
ok(buildShopping(plan2, foods).find((l) => l.key === 'Ovos')!.planned === ovos.planned + 50, 'lista recalcula ao mudar cardápio');

// 9. Open Food Facts: parsing, kJ→kcal, sódio pelo sal, destaques
const prod = parseProduct({ code: '789', product_name: 'Barra de proteína', brands: 'Marca X,Outra', serving_quantity: 50, countries_tags: ['en:brazil'],
  nutriments: { 'energy-kcal_100g': 380, proteins_100g: 30, carbohydrates_100g: 36, fat_100g: 12, fiber_100g: 7, sugars_100g: 4, 'saturated-fat_100g': 6, salt_100g: 0.5 } })!;
ok(prod.brand === 'Marca X' && prod.isBR && prod.extra.sodiumMg === 200, 'parse OFF básico');
const hl = highlights(prod).map((h) => h.label);
ok(hl.includes('Rico em proteína') && hl.includes('Rico em fibras') && hl.includes('Alto em gordura saturada') && !hl.includes('Alto em sódio'), 'destaques OFF: ' + hl.join(', '));
const kj = parseProduct({ code: '1', product_name: 'Suco', quantity: '1 L', nutriments: { energy_100g: 184.1 } })!;
ok(Math.round(kj.per100.kcal) === 44 && kj.liquid && productToFood(kj).unit === 'ml', 'kJ→kcal e líquido');
const noKcal = parseProduct({ code: '2', product_name: 'Sem dados', nutriments: {} })!;
ok(!noKcal.has.kcal && highlights(noKcal).length === 0, 'produto sem dados');
ok(parseProduct({ code: '3', nutriments: {} }) === null, 'produto sem nome descartado');

// 10a. TACO completa
ok(TACO_FOODS.length === 591, 'TACO com 591 alimentos');
const tArroz = TACO_FOODS.find((f) => f.tacoId === 1)!;
ok(tArroz.per100.kcal === 124 && tArroz.micro!.fe === 0.3 && tArroz.measures!.some(([n, g]) => n === 'concha' && g === 117), 'TACO arroz integral + medidas IBGE');
ok(TACO_FOODS.filter((f) => f.meat === 'm').every((f) => !/^frango/i.test(f.name)) && TACO_FOODS.some((f) => f.meat === 'c'), 'marcação de carnes');
ok(TACO_FOODS.find((f) => /^Feijoada/.test(f.name))?.meat === 'm', 'feijoada marcada como carne');
const enriched = BASE_FOODS.map(enrichWithTaco);
const linked = enriched.filter((f) => f.source === 'TACO' && f.tacoId).length, tacoBase = BASE_FOODS.filter((f) => f.source === 'TACO').length;
console.log(`Base inicial ligada à TACO: ${linked}/${tacoBase}`);
ok(linked === tacoBase, 'todos os itens TACO da base ligados à tabela');
const allIdx: Record<string, any> = { ...Object.fromEntries(enriched.map((f) => [f.id, f])) };
const haveT = new Set(enriched.map((f) => f.tacoId));
for (const f of TACO_FOODS) if (!haveT.has(f.tacoId)) allIdx[f.id] = f; // o cálculo de pratos vê tudo

// 10. estimador local de pratos
const d1 = estimateLocal('Peito de Frango Grelhado com macarrão ao molho Alfredo', allIdx);
console.log('Prato 1:', d1.ingredients.map((i) => `${i.foodId}:${i.grams}`).join(', '), '→', Math.round(dishTotals(d1.ingredients).kcal), 'kcal');
ok(d1.ingredients.map((i) => i.foodId).join() === 'frango_grelhado,macarrao,molho_alfredo', 'prato frango alfredo');
const d2 = estimateLocal('2 ovos mexidos e 1 pão francês, café', allIdx);
console.log('Prato 2:', d2.ingredients.map((i) => `${i.foodId}:${i.grams}`).join(', '));
ok(d2.ingredients[0].foodId === 'ovo_preparo' && d2.ingredients[0].grams === 100 && d2.ingredients[1].foodId === 'pao_frances' && d2.ingredients[1].grams === 50, 'quantidades por unidade');
const d3 = estimateLocal('200g de arroz integral + feijão preto, salada e 1 colher de sopa de azeite', allIdx);
console.log('Prato 3:', d3.ingredients.map((i) => `${i.foodId}:${i.grams}`).join(', '));
ok(d3.ingredients[0].grams === 200 && d3.ingredients.some((i) => i.foodId === 'azeite' && i.grams === 8), 'gramas e medida caseira do IBGE (colher de sopa de azeite = 8 g)');
const d4 = estimateLocal('xyzabc', allIdx);
const show = (t: string) => { const d = estimateLocal(t, allIdx); console.log(`  "${t}" →`, d.ingredients.map((i) => `${i.name}${i.origin === 'none' ? ' (?)' : ''} ${Math.round(i.grams)}g`).join(' | '), `= ${Math.round(dishTotals(d.ingredients).kcal)} kcal`); return d; };
const d5 = show('2 conchas de feijão, 3 colheres de sopa de arroz e 1 bife de tilápia');
ok(d5.ingredients[0].grams === 280 && d5.ingredients[1].grams === 75, 'medidas do IBGE por alimento (concha de feijão 140 g, colher de sopa de arroz 25 g)');
const d6 = show('estrogonofe de frango com arroz e batata palha');
ok(d6.ingredients[0].name.startsWith('Estrogonofe de frango'), 'prato pronto da TACO');
show('baião de dois');
show('tapioca com manteiga e um copo de suco de laranja');
show('salada de alface, tomate e cenoura ralada com azeite');
show('1 banana nanica, aveia e mel');
show('cuscuz nordestino com ovo');
show('pão de queijo e café com leite');
show('açaí com granola e banana');
const d7 = show('feijoada');
ok(!!d7.dietWarning, 'aviso de carne na feijoada');
console.log('  aviso:', d7.dietWarning);
const m6 = dishMicro(d5.ingredients.filter((i) => i.origin !== 'none'));
console.log('  micronutrientes prato 5:', m6 && `Fe ${m6.fe?.toFixed(1)} mg, Ca ${m6.ca?.toFixed(0)} mg, Zn ${m6.zn?.toFixed(1)} mg`);
ok(d4.ingredients[0].origin === 'none' && d4.confidence === 'baixa', 'item não reconhecido');

// Relatório do cardápio inicial vs metas
const G = { kcal: 2200, p: 145, c: 250, f: 70 };
const D = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
console.log('\nCardápio inicial (base TACO/USDA) vs metas 2200 kcal · 145 P · 250 C · 70 G');
plan.forEach((d, i) => {
  const t = dayMacros(foods, d);
  const meals = d.map((m) => Math.round(mealMacros(foods, m).kcal)).join(' / ');
  console.log(`${D[i]}: ${t.kcal.toFixed(0).padStart(5)} kcal  P ${t.p.toFixed(0).padStart(3)}  C ${t.c.toFixed(0).padStart(3)}  G ${t.f.toFixed(0).padStart(3)}  fibra ${t.fiber.toFixed(0).padStart(2)}  | Δkcal ${(t.kcal - G.kcal).toFixed(0).padStart(5)}  (refeições: ${meals})`);
});
console.log('\nLista de compras:');
shop.forEach((l) => console.log(`  ${l.category.padEnd(16)} ${l.name.padEnd(48)} ${l.buy.padStart(12)}   (${Math.round(l.planned)} ${l.unit} pronto)`));
console.log(fail ? `\n${fail} verificação(ões) falharam` : '\nTodas as verificações passaram ✓');
process.exit(fail ? 1 : 0);
