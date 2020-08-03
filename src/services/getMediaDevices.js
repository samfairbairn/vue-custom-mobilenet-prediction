var parameters = {
    // type of source - ['webcam', 'image', 'video']
    sourceType : 'webcam',
    // url of the source - valid if sourceType = image|video
    sourceUrl : null,

    // Device id of the camera to use (optional)
    deviceId : null,

    // resolution of at which we initialize in the source image
    sourceWidth: 640,
    sourceHeight: 480,
    // resolution displayed for the source 
    displayWidth: 640,
    displayHeight: 480,
}

var Camera = {}
Camera.initSourceWebcam = function(onReady, onError) {

	// init default value
	onError = onError || function(error){	
		alert('Webcam Error\nName: '+error.name + '\nMessage: '+error.message)
	}

	var domElement = document.createElement('video');
	domElement.setAttribute('autoplay', '');
	domElement.setAttribute('muted', '');
	domElement.setAttribute('playsinline', '');
	domElement.style.width = parameters.displayWidth+'px'
    domElement.style.height = parameters.displayHeight+'px'
    domElement.className = 'ar-webcam'

	// check API is available
	if (navigator.mediaDevices === undefined 
			|| navigator.mediaDevices.enumerateDevices === undefined 
			|| navigator.mediaDevices.getUserMedia === undefined  ){
      let fctName
		if( navigator.mediaDevices === undefined )				fctName = 'navigator.mediaDevices'
		else if( navigator.mediaDevices.enumerateDevices === undefined )	fctName = 'navigator.mediaDevices.enumerateDevices'
		else if( navigator.mediaDevices.getUserMedia === undefined )		fctName = 'navigator.mediaDevices.getUserMedia'
		else console.assert(false)
		onError({
			name: '',
			message: '1. ' + 'WebRTC issue-! '+fctName+' not present in your browser'
		})
		return null
    }
    
    return new Promise((resolve) => {

        // get available devices
        navigator.mediaDevices.enumerateDevices().then(function () {
            var userMediaConstraints = {
                audio: false,
                video: {
                    facingMode: "user",
                    frameRate: 15,
                    width: {
                        ideal: parameters.sourceWidth,
                        // min: 1024,
                        // max: 1920
                    }
                    // height: {
                    //     ideal: parameters.sourceHeight,
                    //     // min: 776,
                    //     // max: 1080
                    // }
                }
            }

            if (null !== parameters.deviceId) {
                userMediaConstraints.video.deviceId = {
                    exact: parameters.deviceId
                };
            }
            
            navigator.mediaDevices.getUserMedia(userMediaConstraints).then(function success(stream) {
                resolve(stream)
            })
            .catch(function(error) {
                onError({
                    name: error.name,
                    message: '2. ' + error.message
                });
            });

            // get a device which satisfy the constraints
            /*
            navigator.mediaDevices.getUserMedia(userMediaConstraints).then(function success(stream) {
                // set the .src of the domElement
                domElement.srcObject = stream;
                // to start the video, when it is possible to start it only on userevent. like in android
                document.body.addEventListener('click', function(){
                    domElement.play();
                })
                // domElement.play();

                // TODO listen to loadedmetadata instead
                // wait until the video stream is ready
                var interval = setInterval(function() {
                    if (!domElement.videoWidth)	return;
                    onReady()
                    clearInterval(interval)
                }, 1000/50);
                
                // onReady(stream)
            }).catch(function(error) {
                onError({
                    name: error.name,
                    message: error.message
                });
            });*/
        }).catch(function(error) {
            onError({
                message: '3. ' + error.message
            });
        });

    })

}

export { Camera }