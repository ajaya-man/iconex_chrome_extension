import React, { Component } from 'react';
import { LEDGER_SERVER } from 'constants/config'
import queryString from 'qs'

const INIT_STATE = {
  error: ''
}

class LedgerIframe extends Component {

  constructor(props) {
    super(props);
    this.state = INIT_STATE;
  }

  componentDidMount() {
    window.addEventListener('message', this.eventHandler);
  }

  componentWillUnmount() {
    window.removeEventListener('message', this.eventHandler);
  }

  shouldComponentUpdate(nextProps) {
    if (this.props.isHidden !== nextProps.isHidden) {
      return true
    }
    return false;
  }

  eventHandler = async (event) => {
    const {
      handleSuccess,
      handleError
    } = this.props;
    const { data } = event
    const parsedData = JSON.parse(data)
    const { error } = parsedData

    if (!error) {
      handleSuccess(event);
    } else {
      handleError(error);
    }
  }

  render() {
    const { isHidden, method, query, path, language, popupType } = this.props;
    const queryToString = query ? `&${queryString.stringify(query)}` : ''
    const pathString = path ? `&path=${path}` : ''
    const langString = `&lang=${language}`
    const versionString = `&networkVer=v3`
    const popupTypeString = `&popupType=${popupType}`
    return (
      <iframe
        title="ICONex Ledger"
        scrolling="no"
        src={`${LEDGER_SERVER}?method=${method}${langString}${versionString}${pathString}${popupTypeString}${queryToString || ''}`}
        style={
          isHidden ? {
            width: '0px',
            height: '0px',
          } : {
              width: '1160px',
              height: '400px',
            }
        }
      />
    )
  }
}

export default LedgerIframe;
