'use strict';

function displayImg(j) {
  I('cameraImg').src = j.base64;
}

function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const meetingId = urlParams.get("meetingId");

  const peer = new Peer(null, { debug: 2 });

  peer.on('open', (id) => {
    console.log("PeerJS server gave us ID " + id);

    const conn = peer.connect(meetingId, {
      reliable: true,
      serialization: 'binary'
    });

    function request() {
      conn.send({ action: "GetImg" });
    }

    conn.on('open', () => {
      console.log("Connected to " + conn.peer);
      request();
    });

    var blobUrl = null;

    conn.on('data', (data) => {
      console.log(`Data received from camera`);
      console.log(data);
      displayImg(data);
      setTimeout(request, 1000);
    });

    conn.on('close', () => {
      console.log("Connection to camera closed");
    });
  });

  peer.on('disconnected', () => {
    console.log("disconnected!");
  });

  peer.on('close', () => {
    console.log('Connection to PeerJS server closed');
  });

  peer.on('error', (err) => {
    console.log(err);
  });
}
