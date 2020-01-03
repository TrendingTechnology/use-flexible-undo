import { useState, useCallback, useRef, useReducer } from 'react';
import {
  MetaActionReturnTypes,
  UndoableEffectWithMeta,
  UndoStackItem,
  PayloadByType,
  EffectsByType,
  UActionCreatorsByType,
  MetaAction,
  LinkedMetaActions,
  UndoStackSetter,
  UndoableHandlerWithMeta,
  MetaActionsByType,
  UndoableEffectWithMetaAndType,
  UndoableDispatch,
  UndoableReducer,
} from './index.types';

export const useInfiniteUndo = <
  MR extends MetaActionReturnTypes = undefined
>() => {
  const actionsRef = useRef<
    Record<string, UndoableEffectWithMetaAndType<any, MR>>
  >({});

  const [past, setPast] = useState<UndoStackItem[]>([]);
  const [future, setFuture] = useState<UndoStackItem[]>([]);

  const undo = useCallback(() => {
    shiftStack(past, setPast, setFuture, type => actionsRef.current[type].undo);
  }, [past]);

  const redo = useCallback(() => {
    shiftStack(future, setFuture, setPast, type => actionsRef.current[type].do);
  }, [future]);

  const makeUndoable = useCallback(
    <P extends any>(effect: UndoableEffectWithMetaAndType<P, MR>) => {
      const { type } = effect;
      console.log('MAKE UNDOABLE', type);
      actionsRef.current[type] = effect;
      return (payload: P) => {
        effect.do(payload);
        setPast(past => [{ type, payload }, ...past]);
        setFuture([]);
      };
    },
    []
  );

  const makeUndoables = useCallback(
    <PBT extends PayloadByType>(
      effects: {
        [K in keyof PBT]: UndoableEffectWithMeta<PBT[K], MR>;
      }
    ) =>
      Object.fromEntries(
        Object.entries(effects).map(([type, effect]) => [
          type,
          //TODO: make this work without type casting
          makeUndoable({ type, ...effect }),
        ])
      ) as EffectsByType<PBT>,
    [makeUndoable]
  );

  const makeUndoablesFromDispatch = useCallback(
    <PBT extends PayloadByType>(
      dispatch: UndoableDispatch<PBT>,
      actions: UActionCreatorsByType<PBT>,
      ...metaActions: MR extends undefined ? [] : [MetaActionsByType<PBT, MR>]
    ) =>
      Object.fromEntries(
        Object.entries(actions).map(([type, action]) => [
          type,
          //TODO: make this work without type casting
          makeUndoable({
            type,
            do: (payload: any) => dispatch(action.do(payload)),
            undo: (payload: any) => dispatch(action.undo(payload)),
            ...(metaActions ? { meta: metaActions[0]![type] } : {}),
          } as any),
        ])
      ) as EffectsByType<PBT>,
    [makeUndoable]
  );

  //No need to infer the Payload here
  const getMetaActions = useCallback((item: UndoStackItem) => {
    //Use an empty object as MR to let TypeScript infer action.custom
    const action = actionsRef.current[item.type] as UndoableEffectWithMeta<
      any,
      {}
    >;
    if (!action.meta) {
      throw new Error(
        `You are getting meta actions for action ${item.type}, but none are registered.`
      );
    }
    return Object.fromEntries(
      Object.entries(action.meta).map(([key, value]) => [
        key,
        () => (value as MetaAction)(item.payload, item.type),
      ])
    ) as LinkedMetaActions<MR>;
  }, []);

  return {
    makeUndoable,
    makeUndoables,
    makeUndoablesFromDispatch,
    undo,
    redo,
    canUndo: () => Boolean(past.length),
    canRedo: () => Boolean(future.length),
    stack: {
      past: [...past],
      future: [...future].reverse(),
    },
    getMetaActions,
  };
};

const shiftStack = (
  from: UndoStackItem[],
  setFrom: UndoStackSetter,
  setTo: UndoStackSetter,
  action: (type: string) => (payload: any) => void
) => {
  if (from.length) {
    const [item, ...rest] = from;
    action(item.type)(item.payload);
    setFrom(rest);
    setTo(to => [item, ...to]);
  }
};

export const makeUndoableReducer = <
  S,
  PBT extends PayloadByType,
  MR extends MetaActionReturnTypes = undefined
>(
  handlers: {
    [K in keyof PBT]: UndoableHandlerWithMeta<PBT[K], S, MR>;
  }
) => ({
  reducer: ((state, { payload, type, undo }) => {
    const handler = handlers[type];
    return handler
      ? undo
        ? handler.undo(payload)(state)
        : handler.do(payload)(state)
      : state; // TODO: when no handler found return state or throw error?
  }) as UndoableReducer<S, PBT>,
  actionCreators: Object.fromEntries(
    Object.keys(handlers).map(type => [
      type,
      {
        do: payload => ({
          type,
          payload,
        }),
        undo: payload => ({
          type,
          payload,
        }),
      },
    ])
  ) as UActionCreatorsByType<PBT>,
  ...({
    metaActions: Object.fromEntries(
      Object.keys(handlers).map(<T extends keyof PBT>(type: T) => [
        type,
        (handlers[type] as UndoableHandlerWithMeta<any, any, {}>).meta,
      ])
    ),
  } as MR extends undefined
    ? {}
    : {
        metaActions: MetaActionsByType<PBT, MR>;
      }),
});

export const useUndoableReducer = <S, PBT extends PayloadByType>(
  reducer: UndoableReducer<S, PBT>,
  initialState: S,
  actionCreators: UActionCreatorsByType<PBT>
) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const boundActionCreators = (Object.fromEntries(
    Object.entries(actionCreators).map(([type, creator]) => [
      type,
      {
        do: (payload: any) => dispatch(creator.do(payload)),
        undo: (payload: any) => dispatch(creator.undo(payload)),
      },
    ])
  ) as any) as EffectsByType<PBT>;
  return {
    state,
    boundActionCreators,
  };
};
