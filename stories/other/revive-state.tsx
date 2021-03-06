import React, { FC, useState, useEffect } from 'react';
import {
  useUndoableEffects,
  makeUndoableFTHandler,
  makeUndoableHandler,
  invertHandlers,
} from 'use-flexible-undo';
import { addUpdater, subtractUpdater } from '../examples-util';
import { rootStyle, topUIStyle, countStyle, actionsStyle } from '../styles';
import { ActionList } from '../components/action-list';
import { NumberInput } from '../components/number-input';
import { BranchNav } from '../components/branch-nav';
import { reviver } from './reviver';

const localStorageKey = 'ufu-revive-state-example';

export const RestoreStateFromHistoryExample: FC = () => {
  const [count, setCount] = useState(0);
  const [amount, setAmount] = useState<number | null>(1);

  const undoableAddHandler = makeUndoableHandler(setCount)(
    addUpdater,
    subtractUpdater
  );

  const {
    undoables,
    undo,
    redo,
    history,
    timeTravel,
    switchToBranch,
    setHistory,
  } = useUndoableEffects({
    handlers: {
      add: undoableAddHandler,
      subtract: invertHandlers(undoableAddHandler),
      updateAmount: makeUndoableFTHandler(setAmount),
    },
  });

  const { add, subtract, updateAmount } = undoables;

  // LOAD ON STARTUP
  useEffect(() => {
    console.log('--- INIT restore state example ---');
    console.log('load history state from localStorage');
    try {
      const data = localStorage.getItem(localStorageKey);
      if (data) {
        const hist: typeof history = JSON.parse(data, reviver);
        // backup the index:
        const indexToRestore = hist.currentPosition.globalIndex;
        // reset the index to zero:
        hist.currentPosition.globalIndex = 0;
        setHistory(hist);
        console.log('restore application state from history');
        // This will only give you the same results if the you
        // keep the initial application state (count, amount)
        // constant inbetween save and load:
        timeTravel(indexToRestore);
      }
    } catch (error) {
      console.log(error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // AUTO SAVE ON CHANGE
  useEffect(() => {
    try {
      console.log('save history state to localStorage');
      // For the sake of this example we do not save the application
      // state (count, amount), only the history state.
      localStorage.setItem(localStorageKey, JSON.stringify(history));
    } catch (error) {
      console.log(error);
    }
  }, [history]);

  return (
    <div className={rootStyle}>
      <div className={topUIStyle}>
        <div className={countStyle}>count &nbsp;= &nbsp;{count}</div>
        <div className={actionsStyle}>
          <label>
            amount =&nbsp;
            <NumberInput
              value={amount}
              onChange={value =>
                updateAmount({
                  from: amount,
                  to: value,
                })
              }
            />
          </label>
          <button disabled={!amount} onClick={() => amount && add(amount)}>
            add
          </button>
          <button disabled={!amount} onClick={() => amount && subtract(amount)}>
            subtract
          </button>
        </div>
        <BranchNav
          history={history}
          switchToBranch={switchToBranch}
          undo={undo}
          redo={redo}
        />
      </div>
      <ActionList
        history={history}
        timeTravel={timeTravel}
        switchToBranch={switchToBranch}
      />
    </div>
  );
};
