// srcdoc inherits the parent base URL. Its fragment links must explicitly refer
// to about:srcdoc so Guide/Skip stay inside the module instead of reloading Home.
export function prepareModuleFrame(html){return html.replace(/href="#/g,'href="about:srcdoc#');}
