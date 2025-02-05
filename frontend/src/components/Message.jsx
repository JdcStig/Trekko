import React from 'react'
import { Alert } from 'react-bootstrap'

const Message = ( { variant , children}) => {
  return (
    <Alert variant={variant}>
      {children}
    </Alert>
  )
}

// Default props in case no variant is provided
Message.defaultProps = {
  variant: 'info',
}


export default Message
