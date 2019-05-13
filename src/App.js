import React, { useState, useEffect } from 'react';
import Peer from 'peerjs';
import Canvas from './canvas';
import './App.css';

const getPeerId = () => {
  const hash = window.location.hash
  if (hash && typeof hash === 'string')
    return hash.replace(/\W/g, '')
}

const onData = (data, setPeers, peerId) =>
  data.on('data', (d) => {
    // console.log('ddata', {d})
    setPeers(peers => ({
      ...peers,
      [peerId]: {
        ...peers[peerId],
        pointer: [...(new Int32Array(d))]
      }
    }))
  })

const buildPeerConnection = (type, connection) =>
  p => ({...p, [connection.peer]: {...(p[connection.peer] || {}), [type]: connection}})

const listenForPeer = (session, setPeers) => {
  session.on('connection', connection => {
    if (connection.label === 'FILE') {
      console.log('incomming file connection');
      // setAppState(s => ({...s, state: 'transferring'}))
      connection.on('open', (x) => {
        console.log('incomming file connection open', connection)
        // connection.send({file, name: file.name, size: file.size, type: file.type})
      })

      setPeers(buildPeerConnection('file', connection))
    }

    if (connection.label === 'DATA') {
      console.log('incomming data connection');
      connection.on('open', () => {
        console.log('incomming data connection open', connection)
        onData(connection, setPeers, connection.peer)
      })
      setPeers(buildPeerConnection('data', connection))
    }
  })
}

const Room = () => { 
  const [photos, setPhotos] = useState([])
  const [appState, setAppState] = useState({state: 'registering'})
  const [peers, setPeers] = useState({})
  console.log('appState', appState.state)
  console.log('peers', peers)

  useEffect(
    () => {
      const session = new Peer(undefined, {debug: 3})
      console.log({session})
      session.on('open', id => {
        console.log({id})
        console.log(`${document.URL}#${id}`)
        const peerId = getPeerId()
        setAppState({
          state: peerId ? 'connectingToHost' : 'waitingForClientConnections',
          id, session
        })

        if (!peerId)
          listenForPeer(session, setPeers)

        if (peerId) {
          console.log('need to connect to ' + peerId)

          const connectToHost = peerId => {
            // make a file and data connection
            const file = session.connect(peerId, {label: 'FILE', reliable: true})
            const data = session.connect(peerId, {label: 'DATA'})
            setPeers(buildPeerConnection('file', file))
            setPeers(buildPeerConnection('data', data))
            setAppState(s => ({...s, state: 'waitingForOpen'}))

            file.on('open', (o) => {
              console.log('file connection open', o);
              setAppState(s => ({
                ...s,
                state: s.state === 'waitingForOpen' ? 'waitingForOpen2' : 'open'
              }))
              file.on('data', (d) => {
                console.log('fdata', {d})
              })
            })

            data.on('open', (o) => {
              console.log('data connection open', o);
              setAppState(s => ({
                ...s,
                state: s.state === 'waitingForOpen' ? 'waitingForOpen2' : 'open'
              }))
              onData(data, setPeers, peerId)
            })

            file.on('error', e => console.log('file error', e))
            data.on('error', e => console.log('data error', e))
          }

          connectToHost(peerId)
        }
      })
    },
    []
  )
  return (
    <div>
      <Canvas peers={Object.values(peers)} photos={photos} socket={{send: sent => {
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
