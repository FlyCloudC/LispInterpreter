class LispError extends Error {
    constructor(message, from) {
        super(message);
        this.from = from;
    }
}

class LispSyntaxError extends LispError {
    /**
     * @param {LispObject[]} exp 
     */
    constructor(exp) {
        function expand(e) {
            if (e instanceof Array)
                return `(${e.map(expand).join(' ')})`;
            else
                return e;
        }
        super(`Syntax error: ${expand(exp)}`);
        this.exp = exp;
    }
}

class LispApplyError extends LispError { }


// To be removed
class LispReadError extends LispError { }
