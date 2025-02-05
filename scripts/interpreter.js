//------------------------------------
const LAST_ENV = Symbol('LAST_ENV');
function bindVar(id, value, env) {
  if (value instanceof LispProceedure && value.name === undefined)
    value.name = id;
  env[id] = value;
}

function extendEnvWithVarList(ids, values, oldEnv) {
  let newEnv = {};
  for (let i = 0; i < ids.length; ++i)
    bindVar(ids[i], values[i], newEnv);
  newEnv[LAST_ENV] = oldEnv;
  return newEnv;
}

function lookInEnv(identifier, env) {
  let value = env[identifier];
  if (value !== undefined)
    return value;
  else if (env[LAST_ENV] !== undefined) {
    return lookInEnv(identifier, env[LAST_ENV]);
  } else
    throw new LispError(`${identifier} is not bound`);
}
//------------------------------------

function evalLisp(exp, env, cc) {
  analyze(exp)(env, cc);
}

function analyze(exp) {
  if (exp instanceof Array) {
    let head = exp[0];
    if (head in analyzeByHead) //特殊形式
      return analyzeByHead[head](exp);
    else //函数调用
      return analyzeApplication(exp);
  }
  // 字面量
  let nx = parseFloat(exp);
  if (!isNaN(nx)) //数字
    return (env, cc) => { cc(new LispNumber(nx)); };
  if (exp[0] === '#') { //布尔
    if (exp === '#t')
      return (env, cc) => { cc(LispTrue); };
    else if (exp === '#f')
      return (env, cc) => { cc(LispFalse); };
  }
  if (exp[0] === '\'') { //symbol
    if (exp.length === 1)
      throw new LispReadError('can\'t read \'');
    return (env, cc) => { cc(new LispSymbol(exp.slice(1))); };
  }
  if (isIdentifier(exp)) //变量
    return (env, cc) => { cc(lookInEnv(exp, env)); };
  throw LispReadError(`can't read ${exp}`);
}

function analyzeExtend(nexp, exp, ...mexps) {
  try {
    return analyze(nexp);
  } catch (err) {
    if (err instanceof LispSyntaxError &&
      (err.exp === nexp || mexps.includes(err.exp)))
      throw new LispSyntaxError(exp);
    else
      throw err;
  }
}

const analyzeByHead = {
  'quote': exp => {
    const qval = textOfQuotation(exp[1]);
    return (env, cc) => { cc(qval); };
  },
  'fn': exp => {
    return analyzeByHead['lambda'](exp);
  },
  'lambda': exp => {
    if (exp.length < 3)
      throw new LispSyntaxError(exp);
    const vars = exp[1];
    if (!isIdentifierList(vars))
      throw new LispSyntaxError(exp);
    const body = exp.slice(2);
    body[body.length - 1].isTail = true;
    const bproc = analyzeSequence(body);
    return (env, cc) => { cc(new CompoundProcedure(vars, bproc, env)); };
  },
  'if': exp => {
    if (exp.length !== 4 && exp.length !== 3)
      throw new LispSyntaxError(exp);

    let pproc = analyze(exp[1]);
    exp[2].isTail = exp.isTail;
    let cproc = analyze(exp[2]);
    if (exp.length === 4) {
      exp[3].isTail = exp.isTail;
      let aproc = analyze(exp[3]);
      return (env, cc) => {
        pproc(env, res => {
          if (isLispTrue(res))
            cproc(env, cc);
          else
            aproc(env, cc);
        });
      }
    } else {
      return (env, cc) => {
        pproc(env, res => {
          if (isLispTrue(res))
            cproc(env, cc);
          else
            cc(LispVoidObj);
        });
      }
    }
  },
  'begin': exp => {
    if (exp.length > 1) {
      exp[exp.length - 1].isTail = exp.isTail;
      return analyzeSequence(exp.slice(1));
    } else {
      return (env, cc) => { cc(LispVoidObj); };
    }
  },
  'define': exp => {
    if (exp.length < 3)
      throw new LispSyntaxError(exp);

    if (exp[1] instanceof Array) {
      if (exp[1].length === 0)
        throw new LispSyntaxError(exp);
      let [_, [pname, ...vars], ...body] = exp;
      let lexp = ['lambda', vars, ...body];
      let nexp = ['define', pname, lexp];
      return analyzeExtend(nexp, exp, lexp);
    } else {

      if (exp.length !== 3)
        throw new LispSyntaxError(exp);
      let id = exp[1];
      if (!isIdentifier(id))
        throw new LispSyntaxError(exp);
      let vproc = analyze(exp[2]);
      return (env, cc) => {
        vproc(env, v => {
          bindVar(id, v, env);
          cc(LispVoidObj);
        });
      }
    }
  },
  'set!': exp => {
    if (exp.length !== 3)
      throw new LispSyntaxError(exp);
    let id = exp[1];
    if (!isIdentifier(id))
      throw new LispSyntaxError(exp);
    let vproc = analyze(exp[2]);
    return (env, cc) => {
      vproc(env, v => {
        while (!(id in env) && LAST_ENV in env)
          env = env[LAST_ENV];
        bindVar(id, v, env);
        cc(LispVoidObj);
      })
    }
  },
  'cond': exp => {
    if (exp.length < 2)
      throw new LispSyntaxError(exp);
    let [_, v, ...rest] = exp;
    if (!(v instanceof Array) || v.length !== 2)
      throw new LispSyntaxError(exp);
    let [p, c] = v;
    if (p === 'else') {
      if (rest.length !== 0)
        throw new LispError('misplaced aux keyword else');
      return analyze(c);
    } else if (rest.length === 0) {
      let nexp = ['if', p, c];
      return analyzeExtend(nexp, exp);
    } else {
      let cexp = ['cond', ...rest];
      let nexp = ['if', p, c, cexp];
      return analyzeExtend(nexp, exp, cexp);
    }
  },
  'let': exp => {
    if (exp.length < 3)
      throw new LispSyntaxError(exp);
    if (exp[1] instanceof Array) {
      let [_, varvals, ...body] = exp;
      if (!varvals.every(x => x instanceof Array && x.length === 2))
        throw new LispSyntaxError(exp);
      let ids = [];
      let vals = [];
      for (let v of varvals) {
        ids.push(v[0]);
        vals.push(v[1]);
      }
      let nexp = [['lambda', ids, ...body], ...vals];
      return analyzeExtend(nexp, exp);
    } else {
      let [_, fname, varvals, ...body] = exp;
      if (!varvals.every(x => x instanceof Array && x.length === 2))
        throw new LispSyntaxError(exp);
      let ids = [];
      let vals = [];
      for (let v of varvals) {
        ids.push(v[0]);
        vals.push(v[1]);
      }
      let lexp = ['lambda', ids, ...body];
      let dexp = ['define', fname, lexp];
      let nexp = [['lambda', [], dexp, [fname, ...vals]]];
      return analyzeExtend(nexp, exp, lexp, dexp);
    }
  },
  'letrec': exp => {
    if (exp.length < 3)
      throw new LispSyntaxError(exp);
    let [_, varvals, ...body] = exp;
    if (!varvals.every(x => x instanceof Array && x.length === 2))
      throw new LispSyntaxError(exp);
    let defs = varvals.map(v => ['define', v[0], v[1]]);
    let nexp = [['lambda', [], ...defs, ...body]];
    return analyzeExtend(nexp, exp);
  },
  'letcc': exp => {
    if (exp.length < 3)
      throw new LispSyntaxError(exp);
    let [_, ccid, ...body] = exp;
    if (!isIdentifier(ccid))
      throw new LispSyntaxError(exp);
    let proc = analyzeSequence(body);
    return (env, cc) => {
      proc(extendEnvWithVarList([ccid], [new LispContinuation(cc)], env), cc);
    }
  },
  'cc': exp => {
    if (exp.length !== 3)
      if (exp.length !== 3)
        throw new LispSyntaxError(exp);
    let [_, k, value] = exp;
    let kproc = analyze(k);
    let vproc = analyze(value);
    return (env, cc) => {
      kproc(env, k => {
        if (!(k instanceof LispContinuation))
          throw new LispApplyError(`${k} is not a continuation`);
        vproc(env, k.value);
      });
    }
  }
}

function analyzeSequence(exps) {
  if (exps.length === 0)
    throw new LispSyntaxError(exps);

  let procs = exps.map(analyze);
  return procs.reverse().reduce((
    (pa, pb) =>
      (env, cc) => {
        pb(env, v => {
          pa(env, cc);
        });
      }
  ));
}

class Thunk {
  constructor(proc, args, cc, addition) {
    this.proc = proc;
    this.args = args;
    this.cc = cc;
    this.addition = addition;
  }
}

function getArguments(aprocs, env, cc) {
  if (aprocs.length === 0) {
    cc([]);
  } else {
    aprocs[0](env, arg0 => {
      getArguments(aprocs.slice(1), env,
        args => cc([arg0, ...args])
      );
    });
  }
}

function analyzeApplication(exp) {
  let [fproc, ...aprocs] = exp.map(analyze);
  if (fproc === undefined)
    throw new LispSyntaxError(exp);

  if (false && exp.isTail) {
    return (env, cc) => {
      fproc(env, f => {
        getArguments(aprocs, env, args => {
          cc(new Thunk(f, args, cc, { env }));
        });
      });
    }
  } else {
    return (env, cc) => {
      fproc(env, fv => {
        getArguments(aprocs, env, args => {
          executeApplication(fv, args, cc, { env, isTail: exp.isTail });
        });
      });
    }
  }
}

function executeApplication(proc, args, cc, addition) {
  if (proc instanceof PrimitiveProcedure) {
    cc(proc.process(args, { cc, ...addition }));
  }
  else if (proc instanceof CompoundProcedure) {
    if (proc.vars.length !== args.length)
      throw new LispError(`incorrect argument count to call ${proc}`);
    proc.bproc(extendEnvWithVarList(proc.vars, args, proc.env), cc);
  }
  else {
    throw new LispError(`attempt to apply non-procedure ${proc}`);
  }
}

function textOfQuotation(exp) {
  if (exp instanceof Array) {
    let res = new LispEmptyList();
    for (let i = exp.length - 1; i >= 0; --i) {
      res = new LispPair(textOfQuotation(exp[i]), res);
    }
    return res;
  } else
    return new LispSymbol(exp);
}

function isIdentifier(x) {
  return typeof x === 'string' &&
    isNaN(parseFloat(x)) &&
    x[0] !== '#';
}

function isIdentifierList(ls) {
  if (!Array.isArray(ls))
    return false;
  if (!ls.every(isIdentifier))
    return false;
  const hash = {};
  for (let e of ls) {
    if (hash[e])
      return false;
    else
      hash[e] = true;
  }
  return true;
}

function isLispTrue(lispobj) {
  return lispobj !== LispFalse;
}
