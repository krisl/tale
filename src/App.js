import React, { useState, useEffect } from 'react';
import Peer from 'peerjs';
import Canvas from './canvas';
import './App.css';

const getHash = () => {
  const hash = window.location.hash
  if (hash && typeof hash === 'string')
    return hash.replace(/\W/g, '')
}

const getQuery = () => {
  return new URLSearchParams(window.location.search).get('h')
}

const getPeerId = getQuery

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

const listenForPeer = (session, setPeers, reduce) => {
  session.on('connection', connection => {
    if (connection.label === 'FILE') {
      console.log('incomming file connection');
      // setAppState(s => ({...s, state: 'transferring'}))
      connection.on('open', (x) => {
        console.log('incomming file connection open', connection)
        // connection.send({file, name: file.name, size: file.size, type: file.type})
        connection.on('data', (d) => {
          console.log('fdata', {d})
          reduce(d)
        })
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
  // TODO let the connection manage its own peers
  const [peers, setPeers] = useState({})
  console.log('appState', appState.state)
  console.log('peers', peers)

  const reduce = sent => {
    if (sent.type === 'ROOM/ADD_PHOTO') {
      console.log('adding', sent.payload)
      setPhotos(photos => [sent.payload, ...photos.filter(photo => photo._id !== sent.payload._oldid)])
    }
    if (sent.type === 'ROOM/REMOVE_PHOTO') {
      console.log('removing', sent.payload)
      setPhotos(photos => photos.filter(photo => photo._id !== sent.payload.photo))
    }
    if (sent.type === 'ROOM/MOVE_PHOTO') {
      console.log('moving', sent.payload)
      setPhotos(photos => photos.map(photo =>
        photo._id === sent.payload.photo
          ? Object.assign({}, photo, {origin: sent.payload.origin})
          : photo
      ))
    }
  }

  useEffect(
    () => {
      const session = new Peer(getHash(), {debug: 3})
      console.log({session})
      session.on('open', id => {
        console.log({id})
        console.log(`${document.URL}?h=${id}`)
        window.location.hash = id
        const peerId = getPeerId()
        setAppState({
          state: peerId ? 'connectingToHost' : 'waitingForClientConnections',
          id, session
        })

        if (!peerId)
          listenForPeer(session, setPeers, reduce)

        if (peerId) {
          console.log('need to connect to ' + peerId)

          const connectToHost = peerId => {
            // make a file and data connection
            const makeFileConnection = () => {
              const file = session.connect(peerId, {label: 'FILE', reliable: true})
              setPeers(buildPeerConnection('file', file))
              setAppState(s => ({...s, state: 'waitingForOpen'}))

              file.on('open', (o) => {
                console.log('file connection open', o);
                setAppState(s => ({
                  ...s,
                  state: s.state === 'waitingForOpen' ? 'waitingForOpen2' : 'open'
                }))
                file.on('data', (d) => {
                  console.log('fdata', {d})
                  reduce(d)
                })
              })

              file.on('error', e => console.log('file error', e))
              file.on('close', (x) => {
                console.log('file reconnecting...', x)
                makeFileConnection()
              })
            }

            const makeDataConnection = () => {
              const data = session.connect(peerId, {label: 'DATA'})
              setPeers(buildPeerConnection('data', data))
              data.on('open', (o) => {
                console.log('data connection open', o);
                setAppState(s => ({
                  ...s,
                  state: s.state === 'waitingForOpen' ? 'waitingForOpen2' : 'open'
                }))
                onData(data, setPeers, peerId)
              })

              data.on('error', e => console.log('data error', e))

              data.on('close', (x) => {
                console.log('data reconnecting...', x)
                makeDataConnection()
              })
            }

            makeFileConnection()
            makeDataConnection()
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
        reduce(sent)
        Object.values(peers).forEach(({ file: connection }) => {
          if (connection.open) 
            connection.send(sent)
        })
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
