import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Touches from 'touches';
import { addWheelListener, removeWheelListener } from 'wheel';
// import API from '@/services/api';

const getOriginFromDragging = ({offset, scaledPointer}) => (
  { 
    x: offset.x + scaledPointer.x,
    y: offset.y + scaledPointer.y
  }
)

class Canvas extends Component {
  constructor(props) {
    super(props);
    this.dom = React.createRef();
    this.onDrop = this.onDrop.bind(this);
    this.onPointerWheel = this.onPointerWheel.bind(this);
    this.onResize = this.onResize.bind(this);
    // This is what controls the viewport translation
    this.origin = { x: 0, y: 0 };
    // This is what controls the viewport scaling
    this.scale = 1;
    // The photos are stored in the state as a base64 string
    // We need to load the as Image objects in order to call ctx.drawImage
    // (and also to extract their width & height for intersection testing)
    // This is where we cache the loaded Image objects
    this.photos = {};
  }

  componentDidMount() {
    const { dom: { current: canvas } } = this;
    // Load the inital set of photos
    this.loadPhotos(this.props);
    // Bind the events
    canvas.addEventListener('dragover', Canvas.onDragOver, false);
    canvas.addEventListener('drop', this.onDrop, false);
    window.addEventListener('resize', this.onResize, false);
    this.touches = Touches(window, { filtered: true, preventSimulated: false })
     .on('start', this.onPointerStart.bind(this))
     .on('move', this.onPointerMove.bind(this))
     .on('end', this.onPointerEnd.bind(this));
    addWheelListener(window, this.onPointerWheel);
    // Initial resize (this will also call the initial draw)
    this.onResize();
  }

  componentWillReceiveProps(props) {
    // The redux state has changed...
    // Load photos as Image objects and store them in the cache
    this.loadPhotos(props);
    // Redraw
    this.draw(props);
  }

  shouldComponentUpdate() {
    return false;
  }

  componentWillUnmount() {
    const { dom: { current: canvas }, touches } = this;
    // We're unloading the room
    // Unbind all event handlers
    touches.disable();
    canvas.removeEventListener('dragover', Canvas.onDragOver);
    canvas.removeEventListener('drop', this.onDrop);
    removeWheelListener(window, this.onPointerWheel);
    window.removeEventListener('resize', this.onResize);
  }

  static onDragOver(e) {
    e.preventDefault();
  }

  onDrop(e) {
    // The user dropped a file into the canvas
    const { socket } = this.props;
    const {
      clientX,
      clientY,
      dataTransfer: { files: [file] },
    } = e;
    e.preventDefault();
    // We're only interested in files
    if (!file) {
      return;
    }
    // Get the screen-space pointer in room-space
    const origin = this.getPointer([clientX, clientY]);
    // Read the file
    const reader = new FileReader();
    reader.onload = () => {
      // Once it loads, send it to the room server:
      socket.send(JSON.stringify({
        type: 'ROOM/ADD_PHOTO',
        payload: {
          origin,
          photo: reader.result.substr(reader.result.indexOf('base64') + 7),
        },
      }));
    };
    reader.readAsDataURL(file);
  }

  onPointerStart(e, pointer) {
    const { photos, socket } = this.props;
    const button = e.button || 0;
    const { x, y } = this.getPointer(pointer);

    // Get photo at pointer
    const intersects = photos
      .filter(({ _id, origin }) => {
        const image = this.photos[_id];
        // Filter it out if it hasn't been loaded
        // yet into the cache as an Image object
        if (!image) {
          return false;
        }
        const { width, height } = image;
        if (
          x < origin.x
          || x > origin.x + width
          || y < origin.y
          || y > origin.y + height
        ) {
          // The pointer is outside the bounds
          return false;
        }
        // We got a hit!
        return true;
      });
    // Reverse the filtered photos to get
    // the one renderded on top first
    intersects.reverse();
    const photo = intersects[0];

    if (
      // Clicking the canvas (or right click)
      // will drag it's origin
      (button === 0 && !photo)
      || (button === 2)
    ) {
      this.dragging = {
        canvas: pointer,
      };
    } else if (
      // Left click drags/removes photos
      button === 0 && photo
    ) {
      if (e.shiftKey) {
        // Shift+Click will remove the photo
        socket.send(JSON.stringify({
          type: 'ROOM/REMOVE_PHOTO',
          payload: {
            photo: photo._id,
          },
        }));
      } else {
        // Left click will drag the photo
        this.dragging = {
          offset: {
            x: photo.origin.x - x,
            y: photo.origin.y - y,
          },
          photo,
        };
      }
    }
  }

  onPointerMove(e, pointer) {
    const { dragging, origin, scale } = this;
    const { peers } = this.props;
    const scaledPointer = this.getPointer(pointer);
    peers.forEach(({ connection }) => {
      if (
        connection._channel
        && connection._channel.readyState === 'open'
      ) {
        connection.send(new Int32Array([scaledPointer.x, scaledPointer.y]));
      }
    });
    if (!dragging) {
      return;
    }
    if (dragging.canvas) {
      // Translate the canvas origin
      origin.x += (pointer[0] - dragging.canvas[0]) / scale;
      origin.y += (pointer[1] - dragging.canvas[1]) / scale;
      dragging.canvas = pointer;
    }
    if (dragging.photo) {
      dragging.scaledPointer = scaledPointer;
    }
    // Redraw
    this.draw();
  }

  onPointerEnd() {
    const { dragging } = this;
    const { socket } = this.props;
    if (!dragging) {
      return;
    }
    delete this.dragging;
    if (dragging.photo) {
      // Send the final translation to the server
      // So it gets saved into the db and broadcasted to the peers
      const { _id: photo } = dragging.photo;
      socket.send(JSON.stringify({
        type: 'ROOM/MOVE_PHOTO',
        payload: {
          origin: getOriginFromDragging(dragging),
          photo,
        },
      }));
    }
  }

  onPointerWheel({ deltaY }) {
    // Zoom the canvas in and out when the mouse wheel moves
    const normalized = 1 + (Math.min(Math.max(-deltaY, -1), 1) * 0.075);
    this.scale *= normalized;
    this.scale = Math.min(Math.max(this.scale, 0.25), 2);
    // Redraw
    this.draw();
  }

  onResize() {
    // Resize the canvas
    const { dom: { current: canvas } } = this;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Redraw
    this.draw();
  }

  getPointer([x, y]) {
    // Convert coordinates from screen-space to room-space
    const { dom: { current: canvas }, origin, scale } = this;
    return {
      x: Math.round(((x - (canvas.width * 0.5)) / scale) - origin.x),
      y: Math.round(((y - (canvas.height * 0.5)) / scale) - origin.y),
    };
  }

  loadPhotos({ photos }) {
    // Go through all the photos in the redux state
    photos.forEach(({ _id, photo }) => {
      // If it's not already in the cache, load it as an Image object
      if (!this.photos[_id]) {
        const img = new Image();
        img.src = `data:image/jpeg;base64,${photo}`;
        img.onload = () => (
          // Redraw once it's loaded into the cache
          this.draw()
        );
        this.photos[_id] = img;
      }
    });
  }

  draw(props) {
    const { dom: { current: canvas }, origin, scale } = this;
    const { peers, photos } = props || this.props;
    const ctx = canvas.getContext('2d');
    // Reset canvas context  TODO is this needed?
    // eslint-disable-next-line no-self-assign
    canvas.width = canvas.width;
    // Room-space coordinates start at the middle of the canvas
    ctx.translate(canvas.width * 0.5, canvas.height * 0.5);
    // Apply user scale
    ctx.scale(scale, scale);
    // Apply user translation
    ctx.translate(origin.x, origin.y);
    // Go through all the photos in the redux state
    photos.forEach(({ _id, origin }) => {
      // Check the cache to see if the photo has been
      // already loaded as an Image object by "loadPhotos"
      if (this.photos[_id]) {
        // Draw the cached Image object
        const {dragging} = this
        const {x, y} = (dragging && dragging.photo && dragging.photo._id === _id)
          ? getOriginFromDragging(dragging)
          : origin
        console.log('drawphoto', x, y)
        ctx.drawImage(this.photos[_id], x, y);
      }
    });
    // Go through all the peers in the redux state
    peers.forEach(({ pointer }) => {
      // Check  if we have received a pointer position
      if (pointer) {
        const [x, y] = pointer;
        // Scale size with viewport
        const radius = 24 / scale;
        // Draw outer circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();
        // Clipping mask circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.9, 0, 2 * Math.PI);
        ctx.clip();
        // Draw the cached Image object
        ctx.restore();
      }
    });
  }

  render() {
    const { dom } = this;
    return (
      <canvas ref={dom} />
    );
  }
}

Canvas.propTypes = {
  peers: PropTypes.arrayOf(PropTypes.shape({
    _id: PropTypes.string.isRequired,
    connection: PropTypes.object.isRequired,
    pointer: PropTypes.arrayOf(PropTypes.number),
  })).isRequired,
  photos: PropTypes.arrayOf(PropTypes.shape({
    origin: PropTypes.shape({
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired,
    }),
    photo: PropTypes.string.isRequired,
  })).isRequired,
  socket: PropTypes.shape({ send: PropTypes.func.isRequired }).isRequired,
};

export default Canvas
