const { Observable, Subject, ReplaySubject } = require('rxjs');
const Rendezvous = require('./Rendezvous');
const ObservablePool = require('./ObservablePool');


module.exports =
  class Channel extends Subject {
    constructor() {
      super();
      this.pool = new ObservablePool(Rendezvous);
    }

    lift(operator) {
      let instance = new this.constructor();

      if (operator) {
        instance.operator = operator;
      }

      instance.source = this;
      return instance;
    }

    _findMatch(op) {
      let match = this.pool
        .filter(r => r.put === op || r.consume === op)
        .zip(op, r => r.value)
        .takeLast(1);
      let result = new ReplaySubject(1);
      match.subscribe(result);
      return result;
    }

    consume() {
      if (this.source && this.source.consume) {
        return this.source.consume();
      }

      if (this.hasError) {
        return Observable.throw(this.thrownError);
      } else if (this.isStopped) {
        return Observable.empty();
      }

      let op = {};
      let rendezvous = this.pool.get(r => !r.consume);
      rendezvous.setOp('consume', op);
      return rendezvous;
    }

    put(value) {
      if (this.source && this.source.put) {
        return this.source.put(value);
      }

      if (this.hasError) {
        return Observable.throw(this.thrownError);
      } else if (this.isStopped) {
        return Observable.empty();
      }

      let op = {};
      let rendezvous = this.pool.get(r => !r.put);
      rendezvous.setOp('put', op);
      rendezvous.setValue(value);
      super.next(value);
      return rendezvous;
    }

    next(value) {
      if (this.source && this.source.next) {
        return this.source.next(value);
      }

      this.put(value);
    }

    add(value) {
      if (this.source && this.source.add) {
        return this.source.add(value);
      }

      if (this.hasError) {
        return Observable.throw(this.thrownError);
      } else if (this.isStopped) {
        return Observable.empty();
      }

      let op;

      if (value && typeof value.subscribe === 'function') {
        op = value;
      } else if (value && typeof value.then === 'function') {
        op = Observable.from(value);
      } else {
        return this.put(value);
      }

      op.subscribe(value => {
        let rendezvous = this.pool.get(r => !r.put);
        rendezvous.setOp('put', op);
        rendezvous.setValue(value);
        super.next(value);
      });

      return this._findMatch(op);
    }

    complete() {
      if (this.source && this.source.complete) {
        return this.source.complete();
      }

      super.complete();
      this.pool.complete();
    }

    error(err) {
      if (this.source && this.source.error) {
        return this.source.error(err);
      }

      super.error(err);
      this.pool.error(err);
    }

    _subscribe(subscriber) {
      if (this.source) {
        return this.source.subscribe(subscriber);
      }

      return super._subscribe(subscriber);
    }
  };
