You should not make your redo/undo handlers depend on external state. Refactor your actions so that you can get dependent state from the action payload (like in all the previous examples) or refactor your state so that you can get it from the previous state (like in the next example).

```typescript
const [count, setCount] = useState(0);
const [amount, setAmount] = useState<Nullber>(1);

//Do NOT do this! Move 'amount' to the action payload or combine it
//with the 'count' state so that you can get it from the prev state.
const addHandler = () => amount && setCount(prev => prev + amount);
const subHandler = () => amount && setCount(prev => prev - amount);

const { add, subtract, updateAmount } = makeUndoables<PayloadByType>({
  add: makeUndoableHandler(addHandler, subHandler),
  subtract: makeUndoableHandler(subHandler, addHandler),
  updateAmount: makeUndoableFromToHandler(setAmount),
});
```

Full code:

```typescript
import React, { FC, useState } from 'react';
import {
  PayloadFromTo,
  useFlexibleUndo,
  makeUndoableFromToHandler,
  makeUndoableHandler,
} from '../.';
import { rootClass, uiContainerClass } from './styles';
import { ActionList } from './components/action-list';

type Nullber = number | null;

interface PayloadByType {
  add: undefined;
  subtract: undefined;
  updateAmount: PayloadFromTo<Nullber>;
}

export const DependentStateWrong: FC = () => {
  const [count, setCount] = useState(0);
  const [amount, setAmount] = useState<Nullber>(1);

  const {
    makeUndoables,
    canUndo,
    undo,
    canRedo,
    redo,
    stack,
    timeTravel,
  } = useFlexibleUndo();

  //Do NOT do this! Move 'amount' to the action payload or combine it
  //with the 'count' state so that you can get it from the prev state.
  const addHandler = () => amount && setCount(prev => prev + amount);
  const subHandler = () => amount && setCount(prev => prev - amount);

  const { add, subtract, updateAmount } = makeUndoables<PayloadByType>({
    add: makeUndoableHandler(addHandler, subHandler),
    subtract: makeUndoableHandler(subHandler, addHandler),
    updateAmount: makeUndoableFromToHandler(setAmount),
  });

  return (
    <div className={rootClass}>
      <div>count = {count}</div>
      <div className={uiContainerClass}>
        <label>
          amount:&nbsp;
          <input
            type="number"
            value={amount === null ? '' : amount}
            onChange={({ target: { value } }) =>
              updateAmount({
                from: amount,
                to: value === '' ? null : Number(value),
              })
            }
          />
        </label>
        <button disabled={!amount} onClick={() => amount && add()}>
          add
        </button>
        <button disabled={!amount} onClick={() => amount && subtract()}>
          subtract
        </button>
        <button disabled={!canUndo} onClick={() => undo()}>
          undo
        </button>
        <button disabled={!canRedo} onClick={() => redo()}>
          redo
        </button>
      </div>
      <ActionList stack={stack} timeTravel={timeTravel} />
    </div>
  );
};
```