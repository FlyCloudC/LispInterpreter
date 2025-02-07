function buildBasedEnv() {
  const basedEnv = { null: LispEmptyListObj };
  [
    numberOperator,
    pairAndListOperator,
    vectorOperator,
    otherOpertator,
    jsExtend,
  ].map(
    plist => plist.forEach(p => {
      basedEnv[p.name] = p;
    })
  );
  return basedEnv;
}

function isLength(x) {
  if (x instanceof LispNumber) {
    let n = x.value;
    return n === parseInt(n) && n >= 0;
  } else {
    return false;
  }
}
function isProperList(x) {
  return x instanceof LispEmptyList ||
    x instanceof LispPair && isProperList(x.cdr);
}
function numberCheck(args, fname) {
  for (let v of args) {
    if (!(v instanceof LispNumber))
      throw new LispApplyError(`${v} is not a real number`);
  }
}
function pairCheck(x) {
  if (!(x instanceof LispPair))
    throw new LispApplyError(`${x} is not a pair`);
}
function vectorCheck(x) {
  if (!(x instanceof LispVector))
    throw new LispApplyError(`${x} is not a vector`);
}
function procedureCheck(x) {
  if (!(x instanceof LispProceedure))
    throw new LispApplyError(`${x} is not a procedure`);
}
class PrimitiveProcedure extends LispProceedure {
  constructor(name, checkArgCount, fun) {
    super(name);
    this.process = (args, addition) => {
      if (!checkArgCount(args.length))
        throw new LispError(`incorrect argument count to call ${this}`);
      try {
        let res = fun(args, addition);
        if (!(res instanceof LispObject))
          throw Error(`unknown return from ${name}`);
        return res;
      } catch (err) {
        if (err instanceof LispApplyError)
          throw new LispError(err.message, name);
        else
          throw err;
      }
    }
  }
}

const numberOperator = [
  new PrimitiveProcedure(
    '+',
    arglen => true,
    args => {
      numberCheck(args, '+');
      let res = 0;
      for (let v of args.map(x => x.value))
        res += v;
      return new LispNumber(res);
    }
  ),
  new PrimitiveProcedure(
    '*',
    arglen => true,
    args => {
      numberCheck(args, '*');
      let res = 1;
      for (let v of args.map(x => x.value))
        res *= v;
      return new LispNumber(res);
    }
  ),
  new PrimitiveProcedure(
    '-',
    arglen => arglen > 0,
    args => {
      numberCheck(args, '-');
      if (args.length === 1)
        return new LispNumber(-args[0].value);
      else {
        let [res, ...rest] = args.map(x => x.value);
        for (let v of rest) {
          res -= v;
        }
        return new LispNumber(res);
      }
    }
  ),
  new PrimitiveProcedure(
    '/',
    arglen => arglen > 0,
    args => {
      numberCheck(args, '/');
      if (args.length === 1)
        return new LispNumber(1 / args[0].value);
      else {
        let [res, ...rest] = args.map(x => x.value);
        for (let v of rest) {
          if (v === 0)
            throw new LispApplyError('undefined for 0');
          res /= v;
        }
        return new LispNumber(res);
      }
    }
  )
];
{
  const cmp = {
    '=': (x, y) => x === y,
    '>': (x, y) => x > y,
    '<': (x, y) => x < y,
    '>=': (x, y) => x >= y,
    '<=': (x, y) => x <= y,
  }
  for (let fname of Object.keys(cmp)) {
    numberOperator.push(new PrimitiveProcedure(
      fname,
      arglen => arglen > 0,
      args => {
        numberCheck(args, fname);
        let nums = args.map(x => x.value);
        for (let i = 1; i < nums.length; ++i) {
          if (!cmp[fname](nums[i - 1], nums[i]))
            return LispFalse;
        }
        return LispTrue;
      },
    ));
  }
}

const pairAndListOperator = [
  new PrimitiveProcedure(
    'pair',
    arglen => arglen === 2,
    args => new LispPair(...args)
  ),
  new PrimitiveProcedure(
    'left',
    arglen => arglen === 1,
    args => {
      let p = args[0];
      pairCheck(p);
      return p.car;
    },
  ),
  new PrimitiveProcedure(
    'right',
    arglen => arglen === 1,
    args => {
      let p = args[0];
      pairCheck(p);
      return p.cdr;
    }
  ),
  new PrimitiveProcedure(
    'set-left!',
    arglen => arglen === 2,
    args => {
      let p = args[0];
      pairCheck(p);
      p.car = args[1];
      return LispVoidObj;
    }
  ),
  new PrimitiveProcedure(
    'set-right!',
    arglen => arglen === 2,
    args => {
      let p = args[0];
      pairCheck(p);
      p.cdr = args[1];
      return LispVoidObj;
    }
  ),
  new PrimitiveProcedure(
    'list',
    arglen => true,
    args => {
      let res = LispEmptyListObj;
      for (let v of args.reverse())
        res = new LispPair(v, res);
      return res;
    }
  ),
  new PrimitiveProcedure(
    'cons*',
    arglen => arglen >= 1,
    args => {
      let [res, ...rest] = args.reverse();
      for (let v of rest)
        res = new LispPair(v, res);
      return res;
    }
  ),
];

const vectorOperator = [
  new PrimitiveProcedure(
    'vector',
    arglen => true,
    args => new LispVector(args)
  ),
  new PrimitiveProcedure(
    'make-vector',
    arglen => arglen === 1 || arglen === 2,
    args => {
      let t = args[0];
      if (!isLength(t))
        throw new LispApplyError(`${t} is not a valid vector length`);
      let f;
      if (args.length === 1)
        f = LispFalse;
      else
        f = args[1];
      return new LispVector(Array(t.value).fill(f));
    }
  ),
  new PrimitiveProcedure(
    'vector-length',
    arglen => arglen === 1,
    args => {
      let v = args[0];
      vectorCheck(v);
      return new LispNumber(v.value.length);
    }
  ),
  new PrimitiveProcedure(
    'vector-ref',
    arglen => arglen === 2,
    args => {
      let [v, n] = args;
      vectorCheck(v);
      if (!isLength(n))
        throw new LispApplyError(`${n} is not a valid index for ${v}`);
      let nv = n.value;
      if (nv >= v.value.length)
        throw new LispApplyError(`${n} is not a valid index for ${v}`);
      return v.value[nv];
    }
  ),
  new PrimitiveProcedure(
    'vector-set!',
    arglen => arglen === 3,
    args => {
      let [v, n, val] = args;
      vectorCheck(v);
      if (!isLength(n))
        throw new LispApplyError(`${n} is not a valid index for ${v}`);
      let nv = n.value;
      if (nv >= v.value.length)
        throw new LispApplyError(`${n} is not a valid index for ${v}`);
      v.value[nv] = val;
      return LispVoidObj;
    }
  ),
  new PrimitiveProcedure(
    'vector-fill!',
    arglen => arglen === 2,
    args => {
      let v = args[0];
      vectorCheck(v);
      let obj = args[1];
      v.value.fill(obj);
      return LispVoidObj;
    }
  ),
  new PrimitiveProcedure(
    'vector->list',
    arglen => arglen === 1,
    args => {
      let v = args[0];
      vectorCheck(v);
      let res = LispEmptyListObj;
      for (let obj of v.value.reverse())
        res = new LispPair(obj, res);
      return res;
    }
  ),
  new PrimitiveProcedure(
    'list->vector',
    arglen => arglen === 1,
    args => {
      let l = args[0];
      if (!isProperList(l))
        throw new LispApplyError(`${l} is not a proper list`);
      let arr = [];
      for (let p = l; p instanceof LispPair; p = p.cdr)
        arr.push(p.car);
      return new LispVector(arr);
    }
  ),
  new PrimitiveProcedure(
    'vector-sort',
    arglen => arglen === 2,
    args => {
      let p = args[0];
      procedureCheck(p);
      let v = args[1];
      vectorCheck(v);
      let arr = v.value.slice(0);
      arr.sort((a, b) =>
        isLispTrue(executeApplication(p, [a, b])) ? -1 : 1
      )
      return new LispVector(arr);
    }
  ),
  new PrimitiveProcedure(
    'vector-sort!',
    arglen => arglen === 2,
    args => {
      let p = args[0];
      procedureCheck(p);
      let v = args[1];
      vectorCheck(v);
      v.value.sort((a, b) =>
        isLispTrue(executeApplication(p, [a, b])) ? -1 : 1
      )
      return LispVoidObj;
    }
  ),
];

const otherOpertator = [
  new PrimitiveProcedure(
    'eq?',
    arglen => arglen === 2,
    args => {
      let [a, b] = args;
      return LispBoolean.of(
        a.__proto__ === b.__proto__ && (
          a instanceof LispEmptyList ||
          (
            (
              a instanceof LispPair ||
              a instanceof LispVector ||
              a instanceof LispBoolean ||
              a instanceof LispProceedure ||
              a instanceof LispHashtables ||
              a instanceof LispNumber ||
              a instanceof LispCharacter
            ) && a === b
          ) || (
            (
              a instanceof LispSymbol ||
              a instanceof LispString
            ) && a.value === b.value
          )
        )
      );
    }
  ),
  new PrimitiveProcedure(
    'boolean?',
    arglen => arglen === 1,
    args => LispBoolean.of(args[0] instanceof LispBoolean)
  ),
  new PrimitiveProcedure(
    'null?',
    arglen => arglen === 1,
    args => LispBoolean.of(args[0] instanceof LispEmptyList)
  ),
  new PrimitiveProcedure(
    'pair?',
    arglen => arglen === 1,
    args => LispBoolean.of(args[0] instanceof LispPair)
  ),
  new PrimitiveProcedure(
    'number?',
    arglen => arglen === 1,
    args => LispBoolean.of(args[0] instanceof LispNumber)
  ),
  new PrimitiveProcedure(
    'char?',
    arglen => arglen === 1,
    args => LispBoolean.of(args[0] instanceof LispCharacter)
  ),
  new PrimitiveProcedure(
    'string?',
    arglen => arglen === 1,
    args => LispBoolean.of(args[0] instanceof LispString)
  ),
  new PrimitiveProcedure(
    'vector?',
    arglen => arglen === 1,
    args => LispBoolean.of(args[0] instanceof LispVector)
  ),
  new PrimitiveProcedure(
    'symbol?',
    arglen => arglen === 1,
    args => LispBoolean.of(args[0] instanceof LispSymbol)
  ),
  new PrimitiveProcedure(
    'procedure?',
    arglen => arglen === 1,
    args => LispBoolean.of(args[0] instanceof LispProceedure)
  ),
  new PrimitiveProcedure(
    'hashtable?',
    arglen => arglen === 1,
    args => LispBoolean.of(args[0] instanceof LispHashtables)
  ),
  new PrimitiveProcedure(
    'error',
    arglen => arglen === 2,
    args => {
      throw LispError(args[0], args[1]);
    }
  ),
];

const jsExtend = [
  new PrimitiveProcedure(
    'js-log',
    arglen => true,
    args => {
      console.log('[js-log]\n', ...args);
      return LispVoidObj;
    }
  ),
  new PrimitiveProcedure(
    'js-log-env',
    arglen => arglen === 0,
    (args, { env }) => {
      console.log(env);
      return LispVoidObj;
    }
  ),
];
