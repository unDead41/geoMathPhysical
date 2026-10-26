// A presentation adapter for the one Game engine. Scoring remains in PostgreSQL.
const SHAPES=['cube','cuboid','pyramid','cylinder','cone'];
const TOPICS=['properties','formula','net'];
const fail=()=>{throw new Error('Invalid Duel protocol 2 checkpoint');};
function question(value,index,settled=false){
  if(!value||value.index!==index||!TOPICS.includes(value.topic)||!value.copy||
    !['ms','en'].every(l=>typeof value.copy[l]?.prompt==='string'&&value.copy[l].prompt.length>0&&Array.isArray(value.copy[l].lines)&&value.copy[l].lines.every(s=>typeof s==='string'))||
    (!settled&&(value.id!==`duel-${index}`||value.shape!==undefined)))fail();
  return structuredClone(value);
}
export function duelCheckpoint(snapshot,now){
  const m=snapshot?.me;
  if(snapshot?.protocol!==2||snapshot.room?.total!==10||snapshot.room.questionIds!==undefined||!m||
    !Number.isInteger(m.answered)||m.answered<0||m.answered>10||!Array.isArray(m.answers)||m.answers.length!==m.answered||
    !Number.isFinite(m.elapsed)||m.elapsed<0||!Number.isFinite(snapshot.serverNow)||!Number.isInteger(m.seq)||m.seq<0||
    typeof m.reviewPending!=='boolean'||!['solid','net'].includes(m.stage)||!m.attempts||
    !['solid','net'].every(k=>m.attempts[k]===null||SHAPES.includes(m.attempts[k])))fail();
  const round=Array.from({length:10},(_,index)=>({id:`duel-${index}`,lines:[],prompt:'',hint:''}));
  let score=0,mistakes=0,skipped=0,hints=0;
  const answers=m.answers.map((a,index)=>{
    if(!a||!SHAPES.includes(a.shape)||!TOPICS.includes(a.topic)||!['correct','wrong','skipped'].includes(a.outcome)||
      typeof a.hint!=='boolean'||!Number.isFinite(a.elapsed)||a.elapsed<0||!a.attempts||
      !['solid','net'].every(k=>a.attempts[k]===null||SHAPES.includes(a.attempts[k]))||
      (a.outcome==='correct'&&(a.attempts.solid!==a.shape||a.attempts.net!==a.shape))||
      (a.outcome==='wrong'&&!['solid','net'].includes(a.failedAt)))fail();
    const q=question(a.question,index,true);
    if(q.id!==a.id||q.shape!==a.shape||q.topic!==a.topic)fail();
    round[index]=q;score+=a.outcome==='correct';mistakes+=a.outcome==='wrong';skipped+=a.outcome==='skipped';hints+=a.hint;
    return structuredClone({...a,firstTry:a.outcome==='correct'});
  });
  if(m.score!==score||m.mistakes!==mistakes||m.skipped!==skipped||m.hints!==hints+(m.answered<10&&m.hintUsed?1:0))fail();
  let index=Math.min(m.answered,9),stage=m.stage,status=m.answered===10?'finished':'running';
  let attempts={...m.attempts},hintUsed=!!m.hintUsed,wrongReader=null,ready=now,lastOutcome=answers.at(-1)?.outcome||null;
  if(m.reviewPending){
    if(!answers.length||!Number.isFinite(m.nextReadyAt)||snapshot.currentQuestion!==null)fail();
    index=m.answered-1;const answer=answers[index];status=answer.outcome==='correct'?'feedback':'review';
    stage=answer.failedAt||(answer.attempts.solid?'net':'solid');attempts={...answer.attempts};hintUsed=answer.hint;
    wrongReader=answer.failedAt==='solid'?'r1':answer.failedAt==='net'?'r2':null;
    ready=now+Math.max(0,m.nextReadyAt-snapshot.serverNow);
  }else if(m.answered<10){
    round[index]=question(snapshot.currentQuestion,index);
    if(m.attempts.net!==null||(stage==='net'?!SHAPES.includes(m.attempts.solid):m.attempts.solid!==null))fail();
    if(!hintUsed&&['ms','en'].some(l=>round[index].copy[l].hint!==undefined))fail();
  }
  return {round,index,stage,status,answers,score,mistakes,skipped,hints:m.hints,firstTry:score,attempts,hintUsed,
    hintOpen:false,elapsed:m.elapsed,questionStartElapsed:m.elapsed,segmentStart:now,
    reviewReadyAt:ready,transitionAt:status==='review'?now+Math.max(0,(m.nextReadyAt-900)-snapshot.serverNow):ready,
    wrongReader,wrongUntil:0,wrongOnQuestion:status==='review'&&lastOutcome==='wrong',lastOutcome,
    duelSeq:m.seq,duelRoomId:snapshot.room.id};
}

export function applyDuelState(game,action,snapshot,now){
  const state=duelCheckpoint(snapshot,now);
  if(state.duelRoomId!==game.duelRoomId||state.duelSeq<game.duelSeq)fail();
  const paused=game.paused,oldIndex=game.index,hintOpen=game.hintOpen;
  Object.assign(game,state);
  game.paused=paused;if(paused)game.pauseStart=now;
  if(action==='hint')game.hintOpen=game.hintUsed&&!hintOpen;
  if(oldIndex===state.index&&action!=='hint')game.hintOpen=state.status==='running'&&hintOpen&&state.hintUsed;
  return action==='scan'?{type:snapshot.actionResult?.type||'restored',target:snapshot.actionResult?.target}:true;
}
