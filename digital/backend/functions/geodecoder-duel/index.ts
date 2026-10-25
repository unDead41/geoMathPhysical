import { createDuelHandler } from './handler.mjs';

Deno.serve(createDuelHandler({env:(name: string)=>Deno.env.get(name)}));
