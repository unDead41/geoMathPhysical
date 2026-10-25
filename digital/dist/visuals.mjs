import { SHAPES } from './core.mjs';

export const PALETTES = {
  mint:   {light:'#C3F1DC', mid:'#8AD6BA', dark:'#58BBA5', stroke:'#236D69'},
  pink:   {light:'#FFE0EF', mid:'#F4A3C8', dark:'#DC6FA7', stroke:'#8D3265'},
  orange: {light:'#FFE5C7', mid:'#FFC17B', dark:'#EF9951', stroke:'#95501B'},
  blue:   {light:'#DCEAFF', mid:'#90BAF4', dark:'#5C95E2', stroke:'#275D9E'},
  violet: {light:'#EEE2FF', mid:'#C4A4EF', dark:'#A578D7', stroke:'#66418E'},
  yellow: {light:'#FFF2C2', mid:'#F3D77C', dark:'#DDB550', stroke:'#806219'},
  coral:  {light:'#FFDED9', mid:'#F4AA9C', dark:'#DD8072', stroke:'#8B433C'},
  lime:   {light:'#E9F4CA', mid:'#BBD78A', dark:'#91B85D', stroke:'#516D2D'}
};
export const PALETTE_NAMES = Object.keys(PALETTES);

export function nextVisualPlan(previous = null, rng = Math.random) {
  function shelf(old = {}, opposite = {}) {
    const available = [...PALETTE_NAMES], colors = {};
    for (const shape of SHAPES) {
      const candidates = available.filter(color => color !== old[shape] && color !== opposite[shape]);
      const picked = candidates[Math.floor(rng() * candidates.length)];
      colors[shape] = picked;
      available.splice(available.indexOf(picked), 1);
    }
    return colors;
  }
  const solid = shelf(previous?.solid);
  const net = shelf(previous?.net, solid);
  return {solid, net};
}
