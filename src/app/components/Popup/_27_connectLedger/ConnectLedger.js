import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import withLanguageProps from 'HOC/withLanguageProps';
import { LedgerIframe, Alert } from 'app/components';
import { routeConstants as ROUTE } from 'constants/index';
import { icx_fetchCoinBalanceApi } from 'redux/api/walletIcxApi'
import { trackerAccountUrl as TRACKER_ACCOUNT_URL } from 'constants/config.js'

const INIT_STATE = {
  ledgerInit: false,
  ledgerLoading: false,
  showBalanceError: false,
  error: ''
}

const POPUP_TYPE = {
  VOTING: 'VOTING',
  TRANSFER: 'TRANSFER',
}

@withRouter
@withLanguageProps
class ConnectLedger extends Component {

  constructor(props) {
    super(props);
    this.state = INIT_STATE;
  }

  closePopup = () => {
    this.setState(INIT_STATE);
    this.props.closePopup();
  }

  handleStartLedger = () => {
    this.setState({
      ledgerInit: true,
      ledgerLoading: true
    })
  }

  handleLedgerSuccess = async (event) => {

    const {
      popupNum,
      history,
      setSelectedWallet,
      setLogInStateForLedger,
      setPopupNum,
      closePopup,
      fetchMyStatusData,
    } = this.props;

    const { data, source } = event
    const parsedData = JSON.parse(data)
    const { method, payload, popupType = '' } = parsedData

    if (popupNum === 1) setPopupNum(2)

    switch (method) {
      case 'icx_getBalance':
        let balanceArr = await Promise.all([
          await icx_fetchCoinBalanceApi(payload[0]),
          await icx_fetchCoinBalanceApi(payload[1]),
          await icx_fetchCoinBalanceApi(payload[2]),
          await icx_fetchCoinBalanceApi(payload[3]),
          await icx_fetchCoinBalanceApi(payload[4])
        ])
        balanceArr = balanceArr.map((balance) => balance.toString())
        source.postMessage(balanceArr, '*')
        break;
      case 'setWallet':
        setLogInStateForLedger({
          isLoggedIn: true,
          ledgerWallet: payload
        })
        setSelectedWallet({
          account: payload.account
        });
        closePopup();
        if (popupType === POPUP_TYPE.TRANSFER) {
          history.push({
            pathname: ROUTE['transaction']
          });
        } 
        break;
      case 'openAccountInfoOnTracker':
        window.open(`${TRACKER_ACCOUNT_URL['icx']}${payload}`)
        break;
      case 'setBalanceError':
        this.setState({
          showBalanceError: true
        })
        break;
      default:
        break;
    }
  }

  handleLedgerError = (error) => {
    this.props.setPopupNum(1)
    this.setState({
      ledgerInit: false,
      ledgerLoading: false,
      error
    })
  }

  closeAlert = () => {
    this.setState({
      showBalanceError: false
    })
  }

  render() {

    const {
      I18n,
      popupNum,
      language,
      location,
    } = this.props;

    const { ledgerLoading, ledgerInit, showBalanceError, error } = this.state;
    const isVoting = location.pathname === ROUTE['voting']

    return (
      <div>
        <div className="dimmed fade-in"></div>
        <div
          style={popupNum === 2 ? { height: 508 } : {}}
          className={`
            popup
            ${popupNum === 2 ? 'address wallet' : ''}
            ${error ? 'fail' : ''}
            moving-down
            `}>
          {
            popupNum === 1 && (
              <div>
                <p className="txt_box">{!error ? I18n.connectLedger.title : I18n.connectLedger.connectError}</p>
                {ledgerLoading
                  ? <div className="loading-holder">
                    <i className="loading black"></i>
                  </div>
                  : <p className="txt" ref={ref => { if (ref) ref.innerHTML = !error ? I18n.connectLedger.desc : I18n.connectLedger.descError }} />
                }
                <a href={`./resource/${I18n.connectLedger.manualFileName}.pdf`} target="_blank"><p className="mint">{I18n.connectLedger.info}</p></a>
                <div className="btn-holder full">
                  <button onClick={this.closePopup} className="btn-type-fill size-half"><span>{I18n.button.close}</span></button>
                  <button onClick={this.handleStartLedger} className="btn-type-normal size-half"><span>{!error ? I18n.button.connect : I18n.button.retry}</span></button>
                </div>
              </div>
            )
          }
          {
            popupNum === 2 && (
              <div>
                <span className="close" onClick={this.closePopup}><em className="_img"></em></span>
                <h1 className="title">{I18n.connectLedger.connectWallet}<span>{`(44'/4801368'/0'/0')`}</span></h1>
              </div>
            )
          }

          {
            ledgerInit && (
              <LedgerIframe
                method={'getBalance'}
                popupType={isVoting ? POPUP_TYPE.VOTING : POPUP_TYPE.TRANSFER}
                language={language}
                handleSuccess={this.handleLedgerSuccess}
                handleError={this.handleLedgerError}
                isHidden={popupNum === 1} />
            )
          }
          {
            showBalanceError && (
              <Alert
                handleCancel={this.closeAlert}
                text={I18n.error.noBalance}
                cancelText={I18n.button.confirm}
              />
            )
          }
        </div>
      </div>
    );
  }
}

export default ConnectLedger;
