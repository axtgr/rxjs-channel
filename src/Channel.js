const { Observable, Subject, ReplaySubject } = require('rxjs');
const Rendezvous = require('./Rendezvous');
const ObservablePool = require('./ObservablePool');


module.exports =
class Channel extends Subject {
  constructor() {
    super();
    this.pool = new ObservablePool(Rendezvous);
  }

  _findMatch(op) {
    let match = this.pool
      .filter(r => r.putOp === op || r.takeOp === op)
      .zip(op, r => r.value)
      .takeLast(1);
    let result = new ReplaySubject(1);
    match.subscribe(result);
    return result;
  }

  take() {
    if (this.hasError) {
      return Observable.throw(this.thrownError);
    } else if (this.isStopped) {
      return Observable.empty();
    }

    let op = {};
    let rendezvous = this.pool.get(r => !r.takeOp);
    rendezvous.setOp('take', op);
    return rendezvous;
  }

  put(value) {
    if (this.hasError) {
      return Observable.throw(this.thrownError);
    } else if (this.isStopped) {
      return Observable.empty();
    }

    let op = {};
    let rendezvous = this.pool.get(r => !r.putOp);
    rendezvous.setOp('put', op);
    rendezvous.setValue(value);
    super.next(value);
    return rendezvous;
  }

  next(value) {
    this.put(value);
  }

  add(value) {
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
      let rendezvous = this.pool.get(r => !r.putOp);
      rendezvous.setOp('put', op);
      rendezvous.setValue(value);
      super.next(value);
    });

    return this._findMatch(op);
  }

  complete() {
    super.complete();
    this.pool.complete();
  }

  error(err) {
    super.error(err);
    this.pool.error(err);
  }
};
