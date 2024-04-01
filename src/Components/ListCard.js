import React from 'react'
import msgIcon from '../assets/message.svg';
const ListCard = (props) => {
    const {dbname} = props;
  return (
    
    <button className="query"><img src={msgIcon} alt="Query" />{dbname}</button>
  )
}

export default ListCard