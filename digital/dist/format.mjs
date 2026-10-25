export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Symbol replacement must leave words such as tepi and overlapping intact.
export function formatMathText(value) {
  return escapeHtml(value).replace(/\bpi\b/g,'π').replaceAll('^2','²').replaceAll('^3','³').replaceAll('*',' × ').replaceAll('=', ' = ').replaceAll('6cm','6 cm').replaceAll('4cm','4 cm').replaceAll('3cm','3 cm').replaceAll(' x ',' × ');
}
