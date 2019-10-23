import { fork, put, call, select, takeLatest } from 'redux-saga/effects'
import AT from 'redux/actionTypes/actionTypes';
import {
  getStake as GET_STAKE,
  setStake as SET_STAKE,
  queryIScore as QUERY_I_SCORE,
  claimIScore as CLAIM_I_SCORE,
  getDelegation as GET_DELEGATION,
  setDelegation as SET_DELEGATION,
  getPReps as GET_P_REPS,
} from 'redux/api/pRepIissApi'
import {
  icx_getTotalSupply as GET_TOTAL_SUPPLY,
  icx_sendTransaction as SEND_TRANSACTION,
} from 'redux/api/walletIcxApi'
import {
  toLoop
} from 'utils'
import {
  ZERO_ADDRESS
} from 'constants/index'

export function* fetchIissInfoFunc({ account }) {
  try {
    yield call(getStakeFunc, { account });
    yield call(queryIScoreFunc, { account });
    yield call(getDelegationFunc, { account });
  } catch (e) {
    console.log(e)
  }
}

function* fetchMyStatusDataFunc() {
  try {
    const account = yield select(state => state.wallet.selectedWallet.account)
    const isLedger = yield select(state => state.ledger.isLedger);
    console.log(account)
    if (isLedger) {
      yield put({ type: AT.updateLedgerWalletBalance, })
    } else {
      yield put({ type: AT.fetchCoinBalance, account, coinType: 'icx' })
    }
    yield put({ type: AT.getStake, account })
    yield put({ type: AT.getDelegation, account })
    yield put({ type: AT.queryIScore, account })
    yield put({ type: AT.getPRepData, })
  } catch (e) {
    console.log(e)
  }
}


function* getPRepDataFunc({ options }) {
  try {
    yield put({ type: AT.getPRepDataLoading });
    const { payload, error } = yield call(GET_P_REPS, { options });
    const totalSupply = yield call(GET_TOTAL_SUPPLY);
    if (payload) {
      yield put({
        type: AT.getPRepDataFulfilled,
        payload: {
          ...payload,
          totalSupply,
        }
      });
    } else {
      yield put({ type: AT.getPRepDataRejected, error, });
    }
  } catch (error) {
    yield put({ type: AT.getPRepDataRejected, error, });
  }
}

function* getStakeFunc({ account }) {
  try {
    yield put({ type: AT.getStakeLoading, account });
    const { payload, error } = yield call(GET_STAKE, { account });
    if (payload) {
      yield put({ type: AT.getStakeFulfilled, payload, account });
    } else {
      yield put({ type: AT.getStakeRejected, error,});
    }
  } catch (error) {
    yield put({ type: AT.getStakeRejected, error, });
  }
}

function* setStakeFunc({ value: input }) {
  try {
    const isLedger = yield select(state => state.ledger.isLedger)
    if (isLedger) {
      const ledgerSignedRawTx = yield select(state => state.ledger.ledgerSignedRawTx)
      yield put({ type: AT.setStakeLoading });
      const payload = yield call(SEND_TRANSACTION, ledgerSignedRawTx);
      yield put({ type: AT.setStakeFulfilled, payload, });
    } else {
      const from = yield select(state => state.wallet.selectedWallet.account)
      yield put({ type: AT.setStakeLoading });
      const privKey = yield select(state => state.wallet.selectedWallet.privKey)
      const txFeeLimit = yield select(state => state.txFee.txFeeLimit)
      const payload = yield call(SET_STAKE, {
        privKey,
        from,
        txFeeLimit,
        input,
      });
      yield put({ type: AT.setStakeFulfilled, payload, });
    }
  } catch (e) {
    alert(e.message);
    yield put({ type: AT.setStakeRejected, error: e });
  }
}

function* queryIScoreFunc({ account }) {
  try {
    yield put({ type: AT.queryIScoreLoading, account });
    const { payload, error } = yield call(QUERY_I_SCORE, { account });
    if (payload) {
      yield put({ type: AT.queryIScoreFulfilled, payload, account });
    } else {
      yield put({ type: AT.queryIScoreRejected, error, });
    }
  } catch (error) {
    yield put({ type: AT.queryIScoreRejected, error, });
  }
}

function* claimIScoreFunc(action) {
  try {
    const isLedger = yield select(state => state.ledger.isLedger)
    if (isLedger) {
      const ledgerSignedRawTx = yield select(state => state.ledger.ledgerSignedRawTx)
      yield put({ type: AT.claimIScoreLoading });
      const payload = yield call(SEND_TRANSACTION, ledgerSignedRawTx);
      yield put({ type: AT.claimIScoreFulfilled, payload, });
    } else {
      const from = yield select(state => state.wallet.selectedWallet.account)
      yield put({ type: AT.claimIScoreLoading });
      const privKey = yield select(state => state.wallet.selectedWallet.privKey)
      const txFeeLimit = yield select(state => state.txFee.txFeeLimit)
      const payload = yield call(CLAIM_I_SCORE, {
        privKey,
        from,
        txFeeLimit,
      });
      yield put({ type: AT.claimIScoreFulfilled, payload, });
    }
  } catch (error) {
    alert(error.message);
    yield put({ type: AT.claimIScoreRejected, error, });
  }
}

function* getDelegationFunc({ account }) {
  try {
    yield put({ type: AT.getDelegationLoading, account });
    const { payload, error } = yield call(GET_DELEGATION, { account });
    if (payload) {
      yield put({ type: AT.getDelegationFulfilled, payload, account });
    } else {
      yield put({ type: AT.getDelegationRejected, error, });
    }
  } catch (error) {
    yield put({ type: AT.getDelegationRejected, error, });
  }
}

function* updateMyVotesFunc({ payload: { address, value } }) {
  try {
    const myVotes = yield select(state => state.pRep.myVotes)
    const _myVotes = myVotes.map(myVote => ({
      ...myVote,
      value: window.web3.toHex(toLoop(myVote.value))
    }))
    const idx = _myVotes.findIndex(myVote => myVote.address === address)
    _myVotes[idx].value = window.web3.toHex(toLoop(value))

    yield put({
      type: AT.getEstimatedTxFee,
      payload: {
        methodName: "setDelegation",
        contractAddress: ZERO_ADDRESS,
        inputObj: {
          delegations: _myVotes
        },
      }
    })
  } catch (e) {
    console.log(e)
  }
}

function* deletePRepFunc({ payload: address }) {
  try {
    const myVotes = yield select(state => state.pRep.myVotes)
    const _myVotes = myVotes.map(myVote => ({
      ...myVote,
      value: window.web3.toHex(toLoop(myVote.value))
    }))
    const idx = _myVotes.findIndex(myVote => myVote.address === address)
    _myVotes.splice(idx, 1)

    yield put({
      type: AT.getEstimatedTxFee,
      payload: {
        methodName: "setDelegation",
        contractAddress: ZERO_ADDRESS,
        inputObj: {
          delegations: _myVotes
        },
      }
    })
  } catch (e) {
    console.log(e)
  }
}

function* setDelegationFunc() {
  try {
    const isLedger = yield select(state => state.ledger.isLedger)
    const input = yield select(state => state.pRep.myVotes)
    if (isLedger) {
      const ledgerSignedRawTx = yield select(state => state.ledger.ledgerSignedRawTx)
      yield put({ type: AT.setDelegationLoading });
      const payload = yield call(SEND_TRANSACTION, ledgerSignedRawTx);
      yield put({ type: AT.setDelegationFulfilled, payload, input, });
    } else {
      const from = yield select(state => state.wallet.selectedWallet.account)
      yield put({ type: AT.setDelegationLoading });
      const privKey = yield select(state => state.wallet.selectedWallet.privKey)
      const txFeeLimit = yield select(state => state.txFee.txFeeLimit)
      const payload = yield call(SET_DELEGATION, {
        privKey,
        from,
        txFeeLimit,
        input,
      });
      yield put({ type: AT.setDelegationFulfilled, payload, input, });
    }
  } catch (error) {
    alert(error.message);
    yield put({ type: AT.setDelegationRejected, error, });
  }
}

function* watchGetPRepList() {
  yield takeLatest(AT.getPRepData, getPRepDataFunc)
}

function* watchFetchMyStatusData() {
  yield takeLatest(AT.fetchMyStatusData, fetchMyStatusDataFunc)
}

function* watchGetStake() {
  yield takeLatest(AT.getStake, getStakeFunc)
}

function* watchSetStake() {
  yield takeLatest(AT.setStake, setStakeFunc)
}

function* watchQueryIScore() {
  yield takeLatest(AT.queryIScore, queryIScoreFunc)
}

function* watchClaimIScore() {
  yield takeLatest(AT.claimIScore, claimIScoreFunc)
}

function* watchGetDelegation() {
  yield takeLatest(AT.getDelegation, getDelegationFunc)
}

function* watchUpdateMyVotes() {
  yield takeLatest(AT.updateMyVotes, updateMyVotesFunc)
}

function* watchDeletePRep() {
  yield takeLatest(AT.deletePRep, deletePRepFunc)
}

function* watchSetDelegation() {
  yield takeLatest(AT.setDelegation, setDelegationFunc)
}

export default function* pRepIissSaga() {
  yield fork(watchFetchMyStatusData);
  yield fork(watchGetPRepList);
  yield fork(watchGetStake);
  yield fork(watchSetStake);
  yield fork(watchQueryIScore);
  yield fork(watchClaimIScore);
  yield fork(watchGetDelegation);
  yield fork(watchUpdateMyVotes);
  yield fork(watchDeletePRep);
  yield fork(watchSetDelegation);
}
