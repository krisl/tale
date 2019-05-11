import React, { useState } from 'react';
import Canvas from './canvas';
import './App.css';

const Room = () => { 
  const [photos, setPhotos] = useState([])
  return (
    <div>
      <Canvas peers={[]} photos={photos} socket={{send: sent => {
        sent = JSON.parse(sent)
        console.log({sent})
        if (sent.type === 'ROOM/ADD_PHOTO') {
          sent.payload._id = Math.random().toString(36).substr(2, 5)
          console.log('adding', sent.payload)
          const newphotos = [sent.payload, ...photos]
          console.log({newphotos})
          setPhotos(newphotos)
        }
        if (sent.type === 'ROOM/REMOVE_PHOTO') {
          console.log('removing', sent.payload)
          const newphotos = photos.filter(photo => photo._id !== sent.payload.photo)
          console.log({newphotos})
          setPhotos(newphotos)
        }
        if (sent.type === 'ROOM/MOVE_PHOTO') {
          console.log('moving', sent.payload)
          const newphotos = photos.map(photo =>
            photo._id === sent.payload.photo
              ? Object.assign({}, photo, {origin: sent.payload.origin})
              : photo
          )
          console.log({newphotos})
          setPhotos(newphotos)
        }
      }}} />
    </div>
  )
}

function App() {
  return (
    <div className="App">
      <Room />
    </div>
  );
}

export default App;
