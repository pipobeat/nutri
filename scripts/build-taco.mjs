// Gera src/data/taco.gen.json (compacto) a partir de data/taco/*.json — `node scripts/build-taco.mjs`
import fs from 'node:fs';
const taco = JSON.parse(fs.readFileSync('data/taco/taco.json', 'utf8'));
const house = JSON.parse(fs.readFileSync('data/taco/household.json', 'utf8'));

const v = (x) => (x === null || x === undefined ? null : typeof x === 'object' ? 0 : x); // traço → 0
// pratos prontos com carne bovina/suína
const MEAT_DISHES = /carreteiro|barreado|bife|charuto|dobradinha|estrogonofe de carne|tropeiro|feijoada|mani[cç]oba|sarapatel|vaca atolada|virado|bolognesa|yakisoba/i;
const meatFlag = (f) => {
  if (f.category === 'Carnes e derivados') return /^frango/i.test(f.name) ? 'c' : 'm';
  if (f.category === 'Alimentos preparados') {
    if (MEAT_DISHES.test(f.name)) return 'm';
    if (/frango/i.test(f.name)) return 'c';
  }
  return '';
};
const hmap = Object.fromEntries(
  house.map((h) => [h.taco_id, h.measures.filter((m) => m.grams > 0).map((m) => [m.measure, m.grams])]),
);
// [id, nome, categoria, preparo, kcal, P, C, G, fibra, Ca, Fe, Zn, Na, Mg, K, vitC, carne, medidas]
const rows = taco
  .filter((f) => v(f.nutrients.energy_kcal) !== null)
  .map((f) => {
    const n = f.nutrients;
    return [f.id, f.name.replace(/\s+/g, ' ').replace(/,(\S)/g, ', $1'), f.category, f.preparation ?? '', v(n.energy_kcal), v(n.protein_g) ?? 0, v(n.carbohydrate_g) ?? 0, v(n.lipids_g) ?? 0, v(n.dietary_fiber_g) ?? 0,
      v(n.calcium_mg), v(n.iron_mg), v(n.zinc_mg), v(n.sodium_mg), v(n.magnesium_mg), v(n.potassium_mg), v(n.vitamin_c_mg), meatFlag(f), hmap[f.id] ?? []];
  });
fs.writeFileSync('src/data/taco.gen.json', JSON.stringify(rows));
console.log(`${rows.length} alimentos (${taco.length - rows.length} sem energia na TACO foram omitidos); ${Object.keys(hmap).length} com medidas caseiras`);
