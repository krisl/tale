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

const buildInviteUrl = (id) => {
  if (!id) return ''
  const { origin, pathname } = window.location
  return `${origin}${pathname}?h=${id}`
}

const humanizeState = (state) => {
  switch (state) {
    case 'registering':
      return { label: 'Starting…', hint: 'Registering with the signalling server.' }
    case 'waitingForClientConnections':
      return { label: 'Waiting for guests', hint: 'Share your invite link — you are the host.' }
    case 'connectingToHost':
      return { label: 'Connecting to host…', hint: 'Opening peer-to-peer channels.' }
    case 'waitingForOpen':
      return { label: 'Opening channels…', hint: 'Waiting for the first connection to open (1 of 2).' }
    case 'waitingForOpen2':
      return { label: 'Almost there…', hint: 'Waiting for the second connection to open (2 of 2).' }
    case 'open':
      return { label: 'Connected', hint: 'Live. Photos and cursors sync peer-to-peer.' }
    default:
      return { label: state || 'Unknown', hint: '' }
  }
}

const countLivePeers = (peers) =>
  Object.values(peers).filter(
    ({ file, data }) => (file && file.open) || (data && data.open)
  ).length

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

const listenForPeer = (session, setPeers, reduce, setPhotos) => {
  session.on('connection', connection => {
    if (connection.label === 'FILE') {
      console.log('incomming file connection');
      // setAppState(s => ({...s, state: 'transferring'}))
      connection.on('open', (x) => {
        console.log('incomming file connection open', connection)
        // connection.send({file, name: file.name, size: file.size, type: file.type})
        // FIXME doesnt actually setPeers, just send each one all the photos
        setPhotos(photos => {
          photos.forEach(photo =>
            setPeers(peers => {
              Object.values(peers).forEach(({ file: connection }) => {
                if (connection.open) {
                  connection.send({
                    type: 'ROOM/ADD_PHOTO',
                    payload: photo
                  })
                }
              })
              return peers
            })
          )
          return photos
        })
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
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [copied, setCopied] = useState(false)
  console.log('appState', appState.state)
  console.log('peers', peers)

  // Highlight the drop target while a file is dragged over the window.
  // The canvas owns the actual `drop` handler, this is only visual feedback.
  useEffect(() => {
    let counter = 0
    const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')
    const onDragEnter = (e) => {
      if (!hasFiles(e)) return
      counter += 1
      setIsDraggingFile(true)
    }
    const onDragLeave = () => {
      counter = Math.max(0, counter - 1)
      if (counter === 0) setIsDraggingFile(false)
    }
    const onDragOver = (e) => { if (hasFiles(e)) e.preventDefault() }
    const onDrop = () => { counter = 0; setIsDraggingFile(false) }
    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [])

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
          listenForPeer(session, setPeers, reduce, setPhotos)

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

  const livePeers = countLivePeers(peers)
  const totalPeers = Object.keys(peers).length
  const status = humanizeState(appState.state)
  const isHost = appState.state === 'waitingForClientConnections'
  const inviteUrl = buildInviteUrl(appState.id)
  const statusTone = appState.state === 'open' || (isHost && livePeers > 0)
    ? 'live'
    : appState.state === 'registering' || appState.state === 'connectingToHost' || appState.state === 'waitingForOpen' || appState.state === 'waitingForOpen2'
      ? 'busy'
      : 'idle'

  const copyInvite = async () => {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
    } catch (e) {
      const ta = document.createElement('textarea')
      ta.value = inviteUrl
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="room">
      <header className="statusbar" aria-live="polite">
        <div className="statusbar-left">
          <span className={`status-dot status-dot--${statusTone}`} />
          <div className="status-text">
            <strong className="status-label">{isHost && livePeers > 0 ? 'Live with guests' : status.label}</strong>
            <span className="status-hint">
              {status.hint} {totalPeers > 0 && `${livePeers}/${totalPeers} peer${totalPeers === 1 ? '' : 's'} live · `}{photos.length} photo{photos.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
        <div className="statusbar-right">
          {appState.id && (
            <button className="invite-btn" type="button" onClick={copyInvite} title={inviteUrl}>
              {copied ? 'Copied!' : isHost ? 'Copy invite link' : 'Copy my room link'}
            </button>
          )}
        </div>
      </header>

      {photos.length === 0 && (
        <div className={`onboarding ${isDraggingFile ? 'onboarding--dragging' : ''}`}>
          <div className="onboarding-card">
            <div className="onboarding-icon" aria-hidden="true">🖼️</div>
            <h1>{isDraggingFile ? 'Drop it — we’ll share it live' : 'Drop in a picture to share'}</h1>
            <p>
              This is a shared canvas. Drag&nbsp;&amp;&nbsp;drop an image anywhere on this page
              and every connected peer sees it instantly, peer-to-peer.
            </p>
            <ol className="onboarding-steps">
              <li><strong>Drop</strong> a JPG / PNG anywhere</li>
              <li><strong>{isHost ? 'Copy the invite link above' : 'Stay connected'}</strong> {isHost ? 'and send it to a friend' : '— photos sync automatically'}</li>
              <li><strong>Drag</strong> photos to move · <strong>Shift+click</strong> to remove · <strong>scroll</strong> to zoom</li>
            </ol>
            {isHost && inviteUrl && (
              <button className="invite-btn invite-btn--large" type="button" onClick={copyInvite}>
                {copied ? 'Invite link copied!' : 'Copy invite link'}
              </button>
            )}
            {!isHost && appState.state !== 'open' && (
              <p className="onboarding-wait">Connecting… keep this tab open until status shows Connected.</p>
            )}
          </div>
        </div>
      )}

      {photos.length > 0 && (
        <div className="mini-hint">
          Drop more images anywhere · drag to move · Shift+click to remove · scroll to zoom
        </div>
      )}

      <Canvas peers={Object.values(peers)} photos={photos} socket={{send: sent => {
        sent = JSON.parse(sent)
        console.log({sent})
        reduce(sent)
        Object.values(peers).forEach(({ file: connection }) => {
          if (connection && connection.open)
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
