import {
  PayloadFromTo,
  Updater,
  PayloadHandler,
  Undoable,
  PayloadByType,
  UReducer,
  UndoableUActionCreatorsByType,
  UDispatch,
  UndoableHandlersByType,
  UpdaterMaker,
  UndoableStateUpdatersByType,
} from './index.types';
import { mapObject, makeActionCreator } from './util-internal';
import { SetStateAction } from 'react';

export const combineHandlers = <P, R>(
  drdo: PayloadHandler<P, R>,
  undo: PayloadHandler<P, R>
): Undoable<PayloadHandler<P, R>> => ({
  drdo,
  undo,
});

export const invertHandlers = <P, R>({
  drdo,
  undo,
}: Undoable<PayloadHandler<P, R>>) => combineHandlers(undo, drdo);

export const makeHandler = <S, R>(
  stateSetter: (stateUpdater: Updater<S>) => R
) => <P = S>(
  updaterMaker: UpdaterMaker<P, S>
): PayloadHandler<P, R> => payload => stateSetter(updaterMaker(payload));

export const makeUndoableHandler = <S, R>(
  stateSetter: (stateUpdater: Updater<S>) => R
) => <P = S>(
  updaterForDrdoMaker: UpdaterMaker<P, S>,
  updaterForUndoMaker: UpdaterMaker<P, S>
) =>
  combineHandlers<P, R>(
    payload => stateSetter(updaterForDrdoMaker(payload)),
    payload => stateSetter(updaterForUndoMaker(payload))
  );

type InferState<S> = S extends SetStateAction<infer S2> ? S2 : S;

export const makeUndoableFTHandler = <S, R>(stateSetter: (s: S) => R) =>
  combineHandlers<PayloadFromTo<InferState<S>>, R>(
    ({ to }) => stateSetter(to),
    ({ from }) => stateSetter(from)
  );

// export const makeUndoablePartialStateFTHandler = <S, S1, R>(
//   stateSetter: (stateUpdater: Updater<S>) => R,
//   setter: (newState: S1) => (state: S) => S
// ) =>
//   combineHandlers<PayloadFromTo<S1>, R>(
//     ({ to }) => stateSetter(setter(to)),
//     ({ from }) => stateSetter(setter(from))
//   );

// export const makeUndoablePartialStateFTUpdater = <S, S1>(
//   setter: (newState: S1) => (state: S) => S
// ) =>
//   combineHandlers<PayloadFromTo<S1>, Updater<S>>(
//     ({ to }) => setter(to),
//     ({ from }) => setter(from)
//   );

export const makeUndoablePartialStateHandler = <S, R, S1, S2, P>(
  stateSetter: (stateUpdater: Updater<S>) => R,
  s1Selector: (payload: P) => (state: S) => S1,
  s2Selector: (state: S) => S2,
  setter: (newState: S2) => (state: S) => S
) => (
  updaterForDrdoMaker: UpdaterMaker<S1, S2>,
  updaterForUndoMaker: UpdaterMaker<S1, S2>
) =>
  combineHandlers<P, R>(
    payload =>
      stateSetter(prev =>
        setter(
          updaterForDrdoMaker(s1Selector(payload)(prev))(s2Selector(prev))
        )(prev)
      ),
    payload =>
      stateSetter(prev =>
        setter(
          updaterForUndoMaker(s1Selector(payload)(prev))(s2Selector(prev))
        )(prev)
      )
  );

export const makeUndoablePartialStateUpdater = <S, S1, S2, P>(
  s1Selector: (payload: P) => (state: S) => S1,
  s2Selector: (state: S) => S2,
  setter: (newState: S2) => (state: S) => S
) => (
  updaterForDrdoMaker: UpdaterMaker<S1, S2>,
  updaterForUndoMaker: UpdaterMaker<S1, S2>
) =>
  combineHandlers<P, Updater<S>>(
    payload => prev =>
      setter(updaterForDrdoMaker(s1Selector(payload)(prev))(s2Selector(prev)))(
        prev
      ),
    payload => prev =>
      setter(updaterForUndoMaker(s1Selector(payload)(prev))(s2Selector(prev)))(
        prev
      )
  );

export const convertHandler = <P, R>(handler: PayloadHandler<P, R>) => <P2 = P>(
  convertor: (p2: P2) => P
) => (payload: P2) => handler(convertor(payload));

export const wrapFTHandler = <S, R>(
  handler: PayloadHandler<PayloadFromTo<S>, R>,
  state: S
) => <P = S>(updater: UpdaterMaker<P, S>): PayloadHandler<P, R> => payload =>
  handler({ from: state, to: updater(payload)(state) });

export const makeUndoableReducer = <S, PBT extends PayloadByType>(
  stateUpdaters: UndoableStateUpdatersByType<S, PBT>
) => ({
  reducer: ((state, { payload, type, meta }) => {
    const updater = stateUpdaters[type];
    return updater
      ? meta && meta.isUndo
        ? updater.undo(payload)(state)
        : updater.drdo(payload)(state)
      : state; // TODO: when no handler found return state or throw error?
  }) as UReducer<S, PBT>,
  actionCreators: mapObject(stateUpdaters)<UndoableUActionCreatorsByType<PBT>>(
    ([type, _]) => [
      type,
      {
        drdo: makeActionCreator(type),
        undo: makeActionCreator(type, true),
      },
    ]
  ),
});

export const bindUndoableActionCreators = <PBT extends PayloadByType>(
  dispatch: UDispatch<PBT>,
  actionCreators: UndoableUActionCreatorsByType<PBT>
) =>
  mapObject(actionCreators)<UndoableHandlersByType<PBT>>(([type, creator]) => [
    type,
    {
      drdo: payload => dispatch(creator.drdo(payload)),
      undo: payload => dispatch(creator.undo(payload)),
    },
  ]);
