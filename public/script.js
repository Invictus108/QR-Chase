// script.js file 
var socket = io()

function domReady(fn) { 
  if ( 
    document.readyState === "complete" || 
    document.readyState === "interactive"
  ) { 
    setTimeout(fn, 1000); 
  } else { 
    document.addEventListener("DOMContentLoaded", fn); 
  } 
} 

domReady(function () { 

  // If found you qr code 
  function onScanSuccess(decodeText, decodeResult) { 
    //alert("You Qr is : " + decodeText, "frhejsgdfbuiehjkrgb", decodeResult); 

    function res() {
    socket.emit("tagged", decodeText)
    //console.log(document.getElementById("name").value)
    }

    socket.on("tagged", data => {
        alert(data + " has been tagged")
    });

  } 

  let htmlscanner = new Html5QrcodeScanner( 
    "my-qr-reader", 
    { fps: 60, qrbos: 250 } 
  ); 
  htmlscanner.render(onScanSuccess); 
});
