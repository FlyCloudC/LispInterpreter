class LispObject { }

class LispPair extends LispObject {
  constructor(car, cdr) {
    super();
    this.car = car;
    this.cdr = cdr;
  }
  toString() {
    function isList(v) {
      return v instanceof LispEmptyList ||
        v instanceof LispPair && isList(v.cdr);
    }
    if (isList(this)) {
      let res = [];
      for (let p = this; p instanceof LispPair; p = p.cdr)
        res.push(p.car.toString())
      return `(${res.join(' ')})`;
    }
    else
      return `(${this.car} . ${this.cdr})`;
  }
}
class LispEmptyList extends LispObject {
  constructor() { super(); }
  toString() { return '()'; }
}
const LispEmptyListObj = new LispEmptyList();
class LispNumber extends LispObject {
  constructor(value) { super(); this.value = value; }
  toString() { return this.value.toString(); }
}
class LispCharacter extends LispObject {
  constructor(value) { super(); this.value = value; }
  toString() { return this.value.toString(); }
}
class LispString extends LispObject {
  constructor(value) { super(); this.value = value; }
  toString() { return this.value; }
}
class LispVector extends LispObject {
  constructor(ls) { super(); this.value = ls; }
  toString() { return `#(${this.value.join(' ')})` }
}
class LispSymbol extends LispObject {
  constructor(str) { super(); this.value = Symbol.for(str); }
  toString() { return Symbol.keyFor(this.value); }
}
class LispBoolean extends LispObject {
  constructor(value) { super(); this.value = value; }
  toString() { return this.value ? '#t' : '#f'; }
}
const LispTrue = new LispBoolean(true);
const LispFalse = new LispBoolean(false);
LispBoolean.of = (b) => b ? LispTrue : LispFalse;

class LispHashtables extends LispObject { }
class LispProceedure extends LispObject {
  constructor(name) { super(); this.name = name; }
  toString() {
    return this.name ? `#<procedure ${this.name}>` : '#<procedure>';
  }
}
class CompoundProcedure extends LispProceedure {
  constructor(vars, bproc, env, name) {
    super();
    this.vars = vars;
    this.bproc = bproc;
    this.env = env;
    this.name = name;
  }
}
class LispContinuation extends LispObject {
  constructor(value) { super(); this.value = value; }
  toString() { return '<continuation>' }
}
class LispVoid extends LispObject {
  constructor() { super(); }
  toString() { return ''; }
}
const LispVoidObj = new LispVoid();
