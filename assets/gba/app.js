/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

(function () {
    "use strict";
    
    var data = __webpack_require__(9);

    module.exports = function romCodeToEnglish (romCode) {
        if (!data[romCode]) {
            return "Unknown Game";
        }
        return escapeHtml(data[romCode][0]);
    }

}());


/***/ }),
/* 1 */,
/* 2 */
/***/ (function(module, exports, __webpack_require__) {


var VBAGraphics = __webpack_require__(3);
var VBASound = __webpack_require__(4);
var VBASaves = __webpack_require__(5);
var VBAInput = __webpack_require__(10);
var VBAUI = __webpack_require__(11);

var isRunning = false;



window.init = function () {

    document.querySelector(".pixels").innerHTML = '<canvas width="240" height="160"></canvas>';

    window.vbaGraphics = new VBAGraphics(window.gbaninja, document.querySelector("canvas"));
    var res = window.vbaGraphics.initScreen();
    
    if (!res) {
        window.vbaGraphics = null;
        document.querySelector(".pixels").innerHTML = "<p style='margin: 20px;'>You need to enable WebGL</p>";
        gtag("event", "webgl_disabled_at_init_1", {});
        return;
    }
    
    window.vbaGraphics.drawFrame();

    window.vbaSound = new VBASound(window.gbaninja);
    window.vbaSaves = new VBASaves(window.gbaninja);
    window.vbaInput = new VBAInput(window.gbaninja);
    window.vbaUI = new VBAUI(document.querySelector(".ui"));

    document.querySelector(".pixels").style.display = "none";
    document.querySelector(".ui").style.display = "block";

    vbaUI.reset();

    window.doPerfCalc();

};


window.start = function () {
    if (window.isRunning) {
        throw new Error("Already started");
    }
    
    if (!window.vbaGraphics) {
        // webgl is disabled
        gtag("event", "webgl_disabled_at_start_1", {});
        return;
    }
    
    document.querySelector(".pixels").style.display = "block";
    document.querySelector(".ui").style.display = "none";

    var onResize = window.vbaGraphics.onResize.bind(window.vbaGraphics, window.innerWidth, window.innerHeight);
    window.onresize = onResize;
    onResize();

    VBAInterface.VBA_start();

    gtag("event", "run_rom_1", {
        event_label: window.vbaSaves.getRomCode() + " " + __webpack_require__(0)(window.vbaSaves.getRomCode()),
    });

    isRunning = true;    
    window.focusCheck();
    window.doTimestep(window.frameNum + 1);
    

};

var GBA_CYCLES_PER_SECOND = 16777216;
var TARGET_FRAMERATE = 500;
window.lastFrameTime = window.performance.now();
window.frameTimeout = null;
window.animationFrameRequest = null;
window.frameNum = 1;
window.lastFocusTime = 0;

window.vbaPerf = {};
vbaPerf.deltaTimesThisSecond = [];
vbaPerf.cyclesThisSecond = [];
vbaPerf.renderDeadlineResultsThisSecond = [];
vbaPerf.spareAudioSamplesThisSecond = [];
vbaPerf.audioDeadlineResultsThisSecond = [];

window.doTimestep = function (frameNum, mustRender) {

    if (!hasEmuModule()) {
        return;
    }

    if (frameNum !== window.frameNum + 1) {
        return;
    }
    window.frameNum = frameNum;

    var currentTime = window.performance.now();
    var deltaTime = currentTime - lastFrameTime;
    var clampedDeltaTime = Math.min(50, deltaTime);

    if (currentTime - window.lastFocusTime > 100 || deltaTime < 0.1) {
        window.animationFrameRequest = window.requestAnimationFrame(function () {
            window.doTimestep(frameNum + 1);
        });
        return;
    }
    lastFrameTime = currentTime;

    if (isRunning) {
        vbaSaves.checkSaves();
        
        var cyclesToDo = Math.floor(GBA_CYCLES_PER_SECOND / (1000 / clampedDeltaTime));
        if (vbaSound.spareSamplesAtLastEvent > 1000) {
            cyclesToDo -= Math.floor(Math.min(cyclesToDo * 0.03, GBA_CYCLES_PER_SECOND / 10000));
        }
        if (vbaSound.spareSamplesAtLastEvent < 700) {
            cyclesToDo += Math.floor(Math.min(cyclesToDo * 0.03, GBA_CYCLES_PER_SECOND / 10000));
        }
        VBAInterface.VBA_do_cycles(cyclesToDo);

        vbaPerf.deltaTimesThisSecond.push(deltaTime);
        vbaPerf.cyclesThisSecond.push(cyclesToDo);
        
        clearTimeout(window.frameTimeout);
        window.frameTimeout = setTimeout(function () {
            window.doTimestep(frameNum + 1);
        }, 1000 / TARGET_FRAMERATE);
        cancelAnimationFrame(window.animationFrameRequest);
        window.animationFrameRequest = window.requestAnimationFrame(function () {
            window.doTimestep(frameNum + 1);
        });

    } else if (VBAInterface.VBA_get_emulating()) {
        VBAInterface.VBA_stop();
        document.querySelector(".pixels").style.display = "none";
        document.querySelector(".ui").style.display = "block";
    }
};

window.hasRequestedFrameButNotRendered = false;
window.focusCheck = function () {
    window.lastFocusTime = window.performance.now();
    window.hasRequestedFrameButNotRendered = true;
    window.requestAnimationFrame(window.focusCheck);
};

window.perfTimer = null;
window.lastPerfTime = performance.now();
window.doPerfCalc = function () {
    
    if (!hasEmuModule()) {
        return;
    }
    
    clearTimeout(window.perfTimer);

    var currentTime = window.performance.now();
    var deltaTime = currentTime - lastPerfTime;
    window.lastPerfTime = currentTime;

    if (window.vbaInput.isKeyDown(vbaInput.bindings.PERF_STATS)) {

        document.querySelector(".perf").style.display = "block";

        function samplesToMillis (samples) {
            return Math.floor(samples / window.vbaSound.getSampleRate() * 1000) + "ms";
        }

        var romCode = window.vbaSaves.getRomCode();
        var sumCycles = vbaPerf.cyclesThisSecond.reduce(function (a, b) { return a + b; }, 0);
        var maxAudioSamples = vbaPerf.spareAudioSamplesThisSecond.reduce(function (a, b) { return Math.max(a, b); }, 0);
        var minAudioSamples = vbaPerf.spareAudioSamplesThisSecond.reduce(function (a, b) { return Math.min(a, b); }, Infinity);
        if (minAudioSamples === Infinity) {
            minAudioSamples = 0;
        }
        var audioDeadlineResults = vbaPerf.audioDeadlineResultsThisSecond.reduce(function (a, b) {
            if (b) {
                a.hit++;
            } else {
                a.miss++;
            }
            return a;
        }, {hit: 0, miss: 0});
        var renderDeadlineResults = vbaPerf.renderDeadlineResultsThisSecond.reduce(function (a, b) {
            if (b) {
                a.hit++;
            } else {
                a.miss++;
            }
            return a;
        }, {hit: 0, miss: 0});
        document.querySelector(".perf-game").innerText = (romCode ? (romCode + " ") : "") + __webpack_require__(0)(romCode);
        document.querySelector(".perf-timesteps").innerText = Math.round(vbaPerf.cyclesThisSecond.length / (deltaTime / 1000));
        document.querySelector(".perf-percentage").innerText = (sumCycles / (GBA_CYCLES_PER_SECOND * (deltaTime / 1000)) * 100).toFixed(1) + "%";
        document.querySelector(".perf-audio-lag").innerText = samplesToMillis(minAudioSamples) + " - " + samplesToMillis(maxAudioSamples);
        document.querySelector(".perf-audio-deadlines").innerText = audioDeadlineResults.hit + " / " + (audioDeadlineResults.hit + audioDeadlineResults.miss);
        document.querySelector(".perf-render-deadlines").innerText = renderDeadlineResults.hit + " / " + (renderDeadlineResults.hit + renderDeadlineResults.miss);
        
    } else {

        document.querySelector(".perf").style.display = "none";

    }


    vbaPerf.cyclesThisSecond.length = 0;
    vbaPerf.deltaTimesThisSecond.length = 0;
    vbaPerf.renderDeadlineResultsThisSecond.length = 0;
    vbaPerf.spareAudioSamplesThisSecond.length = 0;
    vbaPerf.audioDeadlineResultsThisSecond.length = 0;

    window.perfTimer = setTimeout(window.doPerfCalc, 1000);
};

window.scheduleStop = function () {
    isRunning = false;
};




/***/ }),
/* 3 */
/***/ (function(module, exports) {

(function () {
    "use strict";
    
    
    var util = {
        compileShader: function (gl, shaderSource, shaderType) {
            var shader = gl.createShader(shaderType);
            gl.shaderSource(shader, shaderSource);
            gl.compileShader(shader);
            var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
            if (!success) {
                throw new Error("could not compile shader:" + gl.getShaderInfoLog(shader));
            }
            return shader;
        },

        createProgram: function (gl, vertexShader, fragmentShader) {
            var program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            var success = gl.getProgramParameter(program, gl.LINK_STATUS);
            if (!success) {
                throw new Error("program filed to link:" + gl.getProgramInfoLog (program));
            }
            return program;
        },

        createShaderFromScript: function (gl, scriptId, opt_shaderType) {
            // look up the script tag by id.
            var shaderScript = document.getElementById(scriptId);
            var shaderSource = shaderScript.text;
            if (!opt_shaderType) {
                if (shaderScript.type === "x-shader/x-vertex") {
                    opt_shaderType = gl.VERTEX_SHADER;
                } else if (shaderScript.type === "x-shader/x-fragment") {
                    opt_shaderType = gl.FRAGMENT_SHADER;
                } else {
                    throw new Error("Unreachable");
                }
            }
            return this.compileShader(gl, shaderSource, opt_shaderType);
        },

        createProgramFromScripts: function (gl, vertexShaderId, fragmentShaderId) {
            var vertexShader = this.createShaderFromScript(gl, vertexShaderId);
            var fragmentShader = this.createShaderFromScript(gl, fragmentShaderId);
            return this.createProgram(gl, vertexShader, fragmentShader);
        },
        
        createTexture: function (gl, size) {
            var texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            var tempPixels = new Uint16Array(size * size);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_SHORT_5_5_5_1, tempPixels);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            return texture;
        },
        
        updateTexture: function (gl, texture, width, height, pixels) {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0,
                                  width, height, gl.RGBA, gl.UNSIGNED_SHORT_5_5_5_1, pixels);
        },
        
        createFullscreenQuad: function  (gl, lower, upper) {
            var fullscreenQuadBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenQuadBuffer);
            gl.bufferData(
                gl.ARRAY_BUFFER,
                new Float32Array([
                       lower,    lower,
                       upper,    lower,
                       lower,    upper,
                       lower,    upper,
                       upper,    lower,
                       upper,    upper]),
                gl.STATIC_DRAW);
            return fullscreenQuadBuffer;
        },

    };

    
    
    
    
    
    
    
    var GBA_WIDTH = 240;
    var GBA_HEIGHT = 160;
    var TEXTURE_SIZE = 256;
    
    function VBAGraphics (emscriptenModule, canvas) {
        this.emscriptenModule = emscriptenModule;
        this.canvas = canvas;
        
        this.totalFrames = 0;
        this.lastFrameTime = window.performance.now();
        
        // Webgl assets
        this.gl = null;
        this.fullscreenQuadBuffer = null;
        this.texture = null;
        this.shaderProgram = null;
        this.positionLocation = null;
        this.textureSamplerLocation = null;
        
        // Temporary buffer to store pixels as they're being
        // sub'd into the texture.
        this.pixels = new Uint16Array(GBA_WIDTH * GBA_HEIGHT);
        
    }
    VBAGraphics.prototype = Object.create(Object.prototype);
    VBAGraphics.prototype.constructor = VBAGraphics;
    
    VBAGraphics.prototype.initScreen = function () {

        // Get webgl
        this.gl = this.canvas.getContext("webgl", {alpha: false}) ||
            this.canvas.getContext("experimental-webgl", {alpha: false});
        
        if (!this.gl) {
            return false;
        }
        
        // Set up assets
        this.shaderProgram = util.createProgramFromScripts(this.gl, "2d-vertex-shader", "2d-fragment-shader");
        this.texture = util.createTexture(this.gl, TEXTURE_SIZE);
        this.fullscreenQuadBuffer = util.createFullscreenQuad(this.gl, 0, 1);
        
        // Get locations
        this.positionLocation = this.gl.getAttribLocation(this.shaderProgram, "a_position");
        this.textureSamplerLocation = this.gl.getUniformLocation(this.shaderProgram, "u_sampler");
        
        return true;
    };



    VBAGraphics.prototype.drawGBAFrame = function  (gbaPointer8) {
        
        var deltaTime = window.performance.now() - this.lastFrameTime;
        vbaPerf.renderDeadlineResultsThisSecond.push(window.hasRequestedFrameButNotRendered);
        window.hasRequestedFrameButNotRendered = false;
        this.lastFrameTime = window.performance.now();
        
        var gbaPointer16 = gbaPointer8 / 2;
        var gbaHeap16 = this.emscriptenModule.HEAP16;
        for (var i = 0; i < this.pixels.length; i++) {
            this.pixels[i] = gbaHeap16[gbaPointer16 + i];
        }
        util.updateTexture(this.gl, this.texture, GBA_WIDTH, GBA_HEIGHT, this.pixels);
        this.drawFrame();
        this.totalFrames++;
    };

    VBAGraphics.prototype.drawFrame = function  () {
        
        // Bind shader
        this.gl.useProgram(this.shaderProgram);

        // Bind verts
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.fullscreenQuadBuffer);
        this.gl.enableVertexAttribArray(this.positionLocation);
        this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);

        // Bind texture
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.uniform1i(this.textureSamplerLocation, 0);

        // Draw
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
		
    };



    VBAGraphics.prototype.onResize = function (/*windowWidth, windowHeight*/) {
        var canvas = this.canvas;
//        canvas.style.top = canvas.style.bottom = canvas.style.left = canvas.style.right = "0";
//        canvas.style.width = "";
//        canvas.style.height = "";
//
//        var aspect = GBA_WIDTH / GBA_HEIGHT;
//
//        if (windowWidth < windowHeight * aspect) {
//            // Change width
//            var offset = (windowHeight - (windowWidth / aspect)) / 2;
//            canvas.style.top = canvas.style.bottom = offset + "px";
//            canvas.style.width = "100%";
//        }
//        if (windowHeight < windowWidth / aspect) {
//            // Change height
//            var offset = (windowWidth - (windowHeight * aspect)) / 2;
//            canvas.style.left = canvas.style.right = offset + "px";
//            canvas.style.height = "100%";
//        }
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        this.gl.viewport(0, 0, canvas.width, canvas.height);
    };
    
    
    module.exports = VBAGraphics;


}());




/***/ }),
/* 4 */
/***/ (function(module, exports) {

(function () {
    "use strict";
    
    function VBASound(emscriptenModule) {

        this.emscriptenModule = emscriptenModule;

        var AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();
        this.audioChannels = 2;
        this.audioScriptNode = this.audioCtx.createScriptProcessor(512, 2);
        this.audioScriptNode.onaudioprocess = this.handleAudioEvent.bind(this);
        this.audioScriptNode.connect(this.audioCtx.destination);
        this.audioSpareSamplesRingBuffer = new Int16Array(1024 * 16);
        this.audioSpareWritePtr = 0;
        this.audioSpareReadPtr = 0;
        this.spareSamplesAtLastEvent = 0;

    }
    VBASound.prototype = Object.create(Object.prototype);
    VBASound.prototype.constructor = VBASound;

    VBASound.prototype.getSampleRate = function () {
        return this.audioCtx.sampleRate;
    };

    VBASound.prototype.currentAudioTime = function () {
        return this.audioCtx.currentTime;
    };

    VBASound.prototype.getNumExtraSamples = function () {
        var samples = this.audioSpareWritePtr - this.audioSpareReadPtr;
        return samples >= 0 ? samples : (samples + this.audioSpareSamplesRingBuffer.length);
    };

    VBASound.prototype.resetSound = function () {
    };

    VBASound.prototype.writeSound = function (pointer8, length16) {

        if (pointer8 % 2 === 1) {
            console.error("Audio pointer must be 16 bit aligned.");
            return;
        }
        if (length16 % 2 !== 0) {
            console.error("Number of audio samples must be even.");
            return;
        }
        var pointer16 = pointer8 >> 1;
        var heap16 = this.emscriptenModule.HEAP16;
        var i;

        for (i = 0; i < length16; i++) {
            this.audioSpareSamplesRingBuffer[this.audioSpareWritePtr] = heap16[pointer16 + i];
            this.audioSpareWritePtr++;
            if (this.audioSpareWritePtr >= this.audioSpareSamplesRingBuffer.length) {
                this.audioSpareWritePtr = 0;
            }
        }

    };

    VBASound.prototype.handleAudioEvent = function (event) {

        if (!hasEmuModule() || !VBAInterface.VBA_get_emulating()) {
            return;
        }

        var audioBuffers = [];
        var numChannels = event.outputBuffer.numberOfChannels;
        var requiredSamples = event.outputBuffer.length;
        var deadlineResult = 1; // Hit
        var i, channel;

        for (i = 0; i < numChannels; i++) {
            audioBuffers.push(event.outputBuffer.getChannelData(i));
        }

        for (i = 0; i < requiredSamples; i++) {
            for (channel = 0; channel < numChannels; channel++) {
                if (this.audioSpareReadPtr === this.audioSpareWritePtr) {
                    audioBuffers[channel][i] = 0;
                    deadlineResult = 0; // Miss
                } else {
                    audioBuffers[channel][i] = this.audioSpareSamplesRingBuffer[this.audioSpareReadPtr] / 0x4000;
                    this.audioSpareReadPtr++;
                    if (this.audioSpareReadPtr >= this.audioSpareSamplesRingBuffer.length) {
                        this.audioSpareReadPtr -= this.audioSpareSamplesRingBuffer.length;
                    }
                }
            }
        }

        this.spareSamplesAtLastEvent = this.getNumExtraSamples();
        vbaPerf.spareAudioSamplesThisSecond.push(this.spareSamplesAtLastEvent);
        
        vbaPerf.audioDeadlineResultsThisSecond.push(deadlineResult);

        var frameNum = window.frameNum;
        setTimeout(function () {
            window.doTimestep(frameNum + 1);
        }, 0);
        

    };

    // Implementation for browsers without audio support
    function IE_VBASound(emscriptenModule) {
        this.emscriptenModule = emscriptenModule;
    }
    IE_VBASound.prototype = Object.create(Object.prototype);
    IE_VBASound.prototype.constructor = IE_VBASound;

    IE_VBASound.prototype.getSampleRate = function () {
        return 44100;
    };

    IE_VBASound.prototype.currentAudioTime = function () {
        return Date.now() / 1000;
    };

    IE_VBASound.prototype.getNumExtraSamples = function () {
        return 0;
    };

    IE_VBASound.prototype.resetSound = function () {
    };

    IE_VBASound.prototype.writeSound = function () {
    };

    IE_VBASound.prototype.handleAudioEvent = function () {
    };
    
    
    if (window.AudioContext) {
        module.exports = VBASound;
    } else {
        module.exports = IE_VBASound;
    }
    
}());


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

(function () {
    "use strict";
    
    var MODE_LOCAL = "local";
    var MODE_DRIVE = "drive";
    
    var saveAs = __webpack_require__(6).saveAs;
    
    function VBASaves(emscriptenModule) {
        this.emscriptenModule = emscriptenModule;
        
        this.mode = MODE_LOCAL;
        
        this.safeSaveTimeout = null;
        this.unsafeSaveTimeout = null;
        this.unsafeSaveBuffer = null;
        this.localStoragePrefix = "VBAsave_";
        this.lastWarningTime = 0;

    }
    VBASaves.prototype = Object.create(Object.prototype);
    VBASaves.prototype.constructor = VBASaves;
    
    
    VBASaves.prototype.getRomCode = function () {
        var heapu8 = this.emscriptenModule.HEAPU8;
        var romAddress8 = VBAInterface.VBA_get_rom();
        var romCode = String.fromCharCode(
            heapu8[romAddress8 + 0xAC], heapu8[romAddress8 + 0xAD],
            heapu8[romAddress8 + 0xAE], heapu8[romAddress8 + 0xAF]
        ).replace(/[^ -~]/g, function () { return "?"; });
        return romCode;
    };
    
    
    VBASaves.prototype.getSave = function (romCode) {
        // If no rom code supplied, use the currently loaded game
        romCode = romCode || this.getRomCode();
        var base64 = localStorage[this.localStoragePrefix + romCode];
        if (!base64) {
            return null;
        }
        return new Uint8Array(atob(base64).split("").map(function(c) {
            return c.charCodeAt(0);
        }));
    };

    VBASaves.prototype.getSaveSize = function () {
        var save = this.getSave();
        return save ? save.byteLength : 0;
    };

    VBASaves.prototype.softCommit = function (pointer8, size) {
        var heapu8 = this.emscriptenModule.HEAPU8;
        var bufu8 = new Uint8Array(size);
        for (var i = 0; i < size; i++) {
            bufu8[i] = heapu8[pointer8 + i];
        }
        this.unsafeSaveBuffer = bufu8;
    };

    VBASaves.prototype.hardCommit = function (romCode, uint8Array) {
        var binary = "";
        var len = uint8Array.byteLength;
        for (var i = 0; i < len; i++) {
            binary += String.fromCharCode( uint8Array[i]);
        }
        try {
            localStorage[this.localStoragePrefix + romCode] = window.btoa(binary);
        } catch (e) {
            if (window.isShittyLocalstorage) {
                return; // User is already warned.
            }
            if (this.lastWarningTime < Date.now() - 5000) {
                this.lastWarningTime = Date.now();
                modal("Unable to save because the storage quota is exceeded. Try opening a new gba.ninja tab and deleting some saves, then save again.", {title: "Error"});
            }
        }
    };

    VBASaves.prototype.restoreSaveMemory = function (pointer8, targetBufferSize) {
        var save = this.getSave();
        if (!save) {
            return;
        }
        
        if (save.byteLength !== targetBufferSize) {
            throw new Error("Incompatible save size");
        }
        
        var heap8 = this.emscriptenModule.HEAPU8;
        for (var i = 0; i < targetBufferSize; i++) {
            heap8[pointer8 + i] = save[i];
        }

    };
    
    VBASaves.prototype.checkSaves = function () {
        if (VBAInterface.VBA_get_systemSaveUpdateCounter()) {

            // Copy the save to a temporary buffer if it's
            // recently updated.
            if (!this.unsafeSaveTimeout) {
                this.unsafeSaveTimeout = setTimeout(function () {
                    this.unsafeSaveTimeout = null;
                    if (VBAInterface.VBA_get_emulating()) {
                        console.log("[SAVE] changes detected");
                        VBAInterface.VBA_emuWriteBattery();
                        VBAInterface.VBA_reset_systemSaveUpdateCounter();
                    }
                }.bind(this), 32);
            }
            
        }

        // Commit the save to localstorage if it hasn't been
        // changed in a while.
        if (this.unsafeSaveBuffer) {
            var tempUnsafeSaveBuffer = this.unsafeSaveBuffer;
            this.unsafeSaveBuffer = null;
            clearTimeout(this.safeSaveTimeout);
            this.safeSaveTimeout = setTimeout(function () {
                this.safeSaveTimeout = null;
                if (VBAInterface.VBA_get_emulating()) {
                    this.hardCommit(this.getRomCode(), tempUnsafeSaveBuffer);
                    console.log("[SAVE] changes committed");
                } else {
                    console.log("[SAVE] changes discarded, emulator not running");
                }
            }.bind(this), 70);
        }
        
    };
    
    VBASaves.prototype.exportSave = function (romCode) {
        var save = this.getSave(romCode);
        if (!save) {
            throw new Error("No save found for " + romCode);
        }
        var blob = new Blob([save], {contentType: "application/octet-stream"});
        saveAs(blob, romCode + " " + __webpack_require__(0)(romCode) + ".sav", true);
    };
    
    VBASaves.prototype.deleteSave = function (romCode) {
        delete localStorage[this.localStoragePrefix + romCode];
    };
    
    VBASaves.prototype.onFileImportInputChanged = function (e, callback) {

        var binaryFile = e.currentTarget.files[0];
        e.currentTarget.form.reset();
        
        if (binaryFile) {
            var fr = new FileReader();
            fr.readAsArrayBuffer(binaryFile);
            fr.onload = function () {

				var romCodeValidator = /^[A-Z1-9]{4}/;
                var romCode = binaryFile.name.substr(0, 4);

                var romCodeOk = function () {
                    this.importSave(romCode, new Uint8Array(fr.result));
                    callback();
                }.bind(this);
                var romCodeNotOk = function () {
                    return window.modal("Invalid ROM Code", {title: "Error"});
                }.bind(this);

                if (romCode.search(romCodeValidator) === -1) {
                    var modalOpts = window.modal("What is the ROM code of the game that this save file belongs to? (4 uppercase letters or numbers)", {
                        title: "Enter ROM Code",
                        input: "",
                        leftButtonText: "Submit",
                        leftButtonFn: function () {
                            romCode = modalOpts.getInputValue();
                            modalOpts.hideModal();
                            if (romCode.search(romCodeValidator) === -1) {
                                romCodeNotOk();
                                return false;
                            } else {
                                romCodeOk();
                            }
                        },
                        rightButtonText: "Cancel",
                        rightButtonFn: function () {
                            modalOpts.hideModal();
                        },
                    });
                } else {
                    romCodeOk();
                }

            }.bind(this);
        }
    };
    
    
    VBASaves.prototype.listSaves = function () {
        return Object.keys(localStorage).filter(function (v) {
            return v.indexOf(this.localStoragePrefix) === 0;
        }.bind(this)).map(function (v) {
            return {
                romCode: v.substr(this.localStoragePrefix.length, 4),
            };
        }.bind(this));
    };
    
    VBASaves.prototype.importSave = function (romCode, byteArray) {
        this.hardCommit(romCode, byteArray);
    };
    
    
    module.exports = VBASaves;
    
    
}());











/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* FileSaver.js
 * A saveAs() FileSaver implementation.
 * 1.3.2
 * 2016-06-16 18:25:19
 *
 * By Eli Grey, http://eligrey.com
 * License: MIT
 *   See https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md
 */

/*global self */
/*jslint bitwise: true, indent: 4, laxbreak: true, laxcomma: true, smarttabs: true, plusplus: true */

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */

var saveAs = saveAs || (function(view) {
	"use strict";
	// IE <10 is explicitly unsupported
	if (typeof view === "undefined" || typeof navigator !== "undefined" && /MSIE [1-9]\./.test(navigator.userAgent)) {
		return;
	}
	var
		  doc = view.document
		  // only get URL when necessary in case Blob.js hasn't overridden it yet
		, get_URL = function() {
			return view.URL || view.webkitURL || view;
		}
		, save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a")
		, can_use_save_link = "download" in save_link
		, click = function(node) {
			var event = new MouseEvent("click");
			node.dispatchEvent(event);
		}
		, is_safari = /constructor/i.test(view.HTMLElement)
		, is_chrome_ios =/CriOS\/[\d]+/.test(navigator.userAgent)
		, throw_outside = function(ex) {
			(view.setImmediate || view.setTimeout)(function() {
				throw ex;
			}, 0);
		}
		, force_saveable_type = "application/octet-stream"
		// the Blob API is fundamentally broken as there is no "downloadfinished" event to subscribe to
		, arbitrary_revoke_timeout = 1000 * 40 // in ms
		, revoke = function(file) {
			var revoker = function() {
				if (typeof file === "string") { // file is an object URL
					get_URL().revokeObjectURL(file);
				} else { // file is a File
					file.remove();
				}
			};
			setTimeout(revoker, arbitrary_revoke_timeout);
		}
		, dispatch = function(filesaver, event_types, event) {
			event_types = [].concat(event_types);
			var i = event_types.length;
			while (i--) {
				var listener = filesaver["on" + event_types[i]];
				if (typeof listener === "function") {
					try {
						listener.call(filesaver, event || filesaver);
					} catch (ex) {
						throw_outside(ex);
					}
				}
			}
		}
		, auto_bom = function(blob) {
			// prepend BOM for UTF-8 XML and text/* types (including HTML)
			// note: your browser will automatically convert UTF-16 U+FEFF to EF BB BF
			if (/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
				return new Blob([String.fromCharCode(0xFEFF), blob], {type: blob.type});
			}
			return blob;
		}
		, FileSaver = function(blob, name, no_auto_bom) {
			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			// First try a.download, then web filesystem, then object URLs
			var
				  filesaver = this
				, type = blob.type
				, force = type === force_saveable_type
				, object_url
				, dispatch_all = function() {
					dispatch(filesaver, "writestart progress write writeend".split(" "));
				}
				// on any filesys errors revert to saving with object URLs
				, fs_error = function() {
					if ((is_chrome_ios || (force && is_safari)) && view.FileReader) {
						// Safari doesn't allow downloading of blob urls
						var reader = new FileReader();
						reader.onloadend = function() {
							var url = is_chrome_ios ? reader.result : reader.result.replace(/^data:[^;]*;/, 'data:attachment/file;');
							var popup = view.open(url, '_blank');
							if(!popup) view.location.href = url;
							url=undefined; // release reference before dispatching
							filesaver.readyState = filesaver.DONE;
							dispatch_all();
						};
						reader.readAsDataURL(blob);
						filesaver.readyState = filesaver.INIT;
						return;
					}
					// don't create more object URLs than needed
					if (!object_url) {
						object_url = get_URL().createObjectURL(blob);
					}
					if (force) {
						view.location.href = object_url;
					} else {
						var opened = view.open(object_url, "_blank");
						if (!opened) {
							// Apple does not allow window.open, see https://developer.apple.com/library/safari/documentation/Tools/Conceptual/SafariExtensionGuide/WorkingwithWindowsandTabs/WorkingwithWindowsandTabs.html
							view.location.href = object_url;
						}
					}
					filesaver.readyState = filesaver.DONE;
					dispatch_all();
					revoke(object_url);
				}
			;
			filesaver.readyState = filesaver.INIT;

			if (can_use_save_link) {
				object_url = get_URL().createObjectURL(blob);
				setTimeout(function() {
					save_link.href = object_url;
					save_link.download = name;
					click(save_link);
					dispatch_all();
					revoke(object_url);
					filesaver.readyState = filesaver.DONE;
				});
				return;
			}

			fs_error();
		}
		, FS_proto = FileSaver.prototype
		, saveAs = function(blob, name, no_auto_bom) {
			return new FileSaver(blob, name || blob.name || "download", no_auto_bom);
		}
	;
	// IE 10+ (native saveAs)
	if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) {
		return function(blob, name, no_auto_bom) {
			name = name || blob.name || "download";

			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			return navigator.msSaveOrOpenBlob(blob, name);
		};
	}

	FS_proto.abort = function(){};
	FS_proto.readyState = FS_proto.INIT = 0;
	FS_proto.WRITING = 1;
	FS_proto.DONE = 2;

	FS_proto.error =
	FS_proto.onwritestart =
	FS_proto.onprogress =
	FS_proto.onwrite =
	FS_proto.onabort =
	FS_proto.onerror =
	FS_proto.onwriteend =
		null;

	return saveAs;
}(
	   typeof self !== "undefined" && self
	|| typeof window !== "undefined" && window
	|| this.content
));
// `self` is undefined in Firefox for Android content script context
// while `this` is nsIContentFrameMessageManager
// with an attribute `content` that corresponds to the window

if (typeof module !== "undefined" && module.exports) {
  module.exports.saveAs = saveAs;
} else if (("function" !== "undefined" && __webpack_require__(7) !== null) && (__webpack_require__(8) !== null)) {
  !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = function() {
    return saveAs;
  }.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
}

/***/ }),
/* 7 */
/***/ (function(module, exports) {

module.exports = function() {
	throw new Error("define cannot be used indirect");
};


/***/ }),
/* 8 */
/***/ (function(module, exports) {

/* WEBPACK VAR INJECTION */(function(__webpack_amd_options__) {/* globals __webpack_amd_options__ */
module.exports = __webpack_amd_options__;

/* WEBPACK VAR INJECTION */}.call(exports, {}))

/***/ }),
/* 9 */
/***/ (function(module, exports) {

module.exports = {"BJBJ":["007 - Everything or Nothing",{"eeprom":{"size":"512"}}],"BJBE":["007 - Everything or Nothing",{"eeprom":{"size":"512"}}],"A7OE":["007 - NightFire",{"eeprom":{"size":"512"}}],"BFBP":["2 Disney Games - Disney Sports - Football + Disney Sports - Skateboarding",{"sram":{"size":"32768"}}],"BLQP":["2 Disney Games - Lilo & Stitch 2 + Peter Pan - Return to Neverland",{"eeprom":{"size":"512"}}],"BQJE":["2 Game Pack! - Hot Wheels - Stunt Track Challenge + Hot Wheels - World Race",{}],"BB4P":["2 Game Pack! - Matchbox Missions - Emergency Response & Air, Land and Sea Rescue",{}],"BB4E":["2 Game Pack! - Matchbox Missions - Emergency Response + Air, Land and Sea Rescue",{}],"BUQP":["2 Game Pack! - Uno & Skip-Bo",{}],"BUQE":["2 Game Pack! - Uno + Skip-Bo",{}],"BINY":["2 Games in 1 - Alla Ricerca di Nemo + Gli Incredibili - Una 'Normale' Famiglia di Supereroi",{}],"BL5P":["2 Games in 1 - Bionicle + Knights' Kingdom",{}],"BLBX":["2 Games in 1 - Brother Bear + The Lion King",{"eeprom":{"size":"512"}}],"BINZ":["2 Games in 1 - Buscando a Nemo + Los Increibles",{}],"BW2E":["2 Games in 1 - Cartoon Network Block Party + Cartoon Network Speedway",{}],"BW9P":["2 Games in 1 - Columns Crown + ChuChu Rocket!",{"flash":{"size":"65536"}}],"BDZD":["2 Games in 1 - Die Monster AG + Findet Nemo",{}],"BLPS":["2 Games in 1 - Disney Princesas + El Rey Leon",{"eeprom":{"size":"512"}}],"BWBS":["2 Games in 1 - Disney Princesas + Hermano Oso",{"eeprom":{"size":"512"}}],"BLDS":["2 Games in 1 - Disney Princesas + Lizzie McGuire",{"eeprom":{"size":"8192"}}],"BWBP":["2 Games in 1 - Disney Princess + Brother Bear",{"eeprom":{"size":"512"}}],"BLDP":["2 Games in 1 - Disney Princess + Lizzie McGuire",{"eeprom":{"size":"8192"}}],"BWBF":["2 Games in 1 - Disney Princesse + Frere des Ours",{"eeprom":{"size":"512"}}],"BLPF":["2 Games in 1 - Disney Princesse + Le Roi Lion",{"eeprom":{"size":"512"}}],"BLPI":["2 Games in 1 - Disney Principesse + Il Re Leone",{"eeprom":{"size":"512"}}],"BWBI":["2 Games in 1 - Disney Principesse + Koda, Fratello Orso",{"eeprom":{"size":"512"}}],"BWBD":["2 Games in 1 - Disneys Prinzessinnen + Baerenbrueder",{"eeprom":{"size":"512"}}],"BLPD":["2 Games in 1 - Disneys Prinzessinnen + Der Koenig der Loewen",{"eeprom":{"size":"512"}}],"BZPP":["2 Games in 1 - Dr. Mario + Puzzle League",{"eeprom":{"size":"512"}}],"BLFE":["2 Games in 1 - Dragon Ball Z - The Legacy of Goku I & II",{"eeprom":{"size":"8192"}}],"BIND":["2 Games in 1 - Findet Nemo + Die Unglaublichen",{}],"BFWY":["2 Games in 1 - Findet Nemo + Findet Nemo - Das Abenteuer Geht Weiter",{}],"BFWX":["2 Games in 1 - Finding Nemo + Finding Nemo - The Continuing Adventures",{}],"BFWP":["2 Games in 1 - Finding Nemo + Finding Nemo - The Continuing Adventures",{}],"BFWZ":["2 Games in 1 - Finding Nemo + Finding Nemo - The Continuing Adventures",{}],"BINX":["2 Games in 1 - Finding Nemo + The Incredibles",{}],"BINP":["2 Games in 1 - Finding Nemo + The Incredibles",{}],"BNEE":["2 Games in 1 - Finding Nemo - The Continuing Adventures + The Incredibles",{}],"BWCE":["2 Games in 1 - Golden Nugget Casino + Texas Hold 'em Poker",{}],"BHZE":["2 Games in 1 - Hot Wheels - Velocity X + Hot Wheels - World Race",{}],"BHZP":["2 Games in 1 - Hot Wheels - Velocity X + Hot Wheels - World Race",{}],"BRSF":["2 Games in 1 - Les Razmoket Rencontrent les Delajungle + SpongeBob SquarePants - SuperSponge",{}],"BDZI":["2 Games in 1 - Monsters & Co. + Alla Ricerca di Nemo",{}],"BDZH":["2 Games in 1 - Monsters en Co. + Finding Nemo",{}],"BDZP":["2 Games in 1 - Monsters, Inc. + Finding Nemo",{}],"BDZE":["2 Games in 1 - Monsters, Inc. + Finding Nemo",{}],"BDZF":["2 Games in 1 - Monstres & Cie + Le Monde de Nemo",{}],"BDZS":["2 Games in 1 - Monstruos, S.A. + Buscando a Nemo",{}],"BARP":["2 Games in 1 - Moto GP + GT Advance 3 - Pro Concept Racing",{"eeprom":{"size":"512"}}],"BRZF":["2 Games in 1 - Power Rangers - Ninja Storm + Power Rangers - La Force du Temps",{}],"BRZE":["2 Games in 1 - Power Rangers - Ninja Storm + Power Rangers - Time Force",{}],"BRZP":["2 Games in 1 - Power Rangers - Ninja Storm + Power Rangers - Time Force",{}],"BRZD":["2 Games in 1 - Power Rangers - Ninja Storm + Power Rangers - Time Force",{}],"BWQE":["2 Games in 1 - Quad Desert Fury + Monster Trucks",{}],"BRSP":["2 Games in 1 - Rugrats - Go Wild + SpongeBob SquarePants - SuperSponge",{}],"BPUS":["2 Games in 1 - Scooby-Doo + Scooby-Doo 2 - Desatado",{"eeprom":{"size":"512"}}],"BPUF":["2 Games in 1 - Scooby-Doo + Scooby-Doo 2 - Les Monstres Se Dechainent",{"eeprom":{"size":"512"}}],"BPUP":["2 Games in 1 - Scooby-Doo + Scooby-Doo 2 - Monsters Unleashed",{"eeprom":{"size":"512"}}],"BPUE":["2 Games in 1 - Scooby-Doo + Scooby-Doo 2 - Monsters Unleashed",{"eeprom":{"size":"512"}}],"BCVE":["2 Games in 1 - Scooby-Doo! - Mystery Mayhem + Scooby-Doo and the Cyber Chase",{"eeprom":{"size":"512"}}],"BCVP":["2 Games in 1 - Scooby-Doo! - Mystery Mayhem + Scooby-Doo and the Cyber Chase",{"eeprom":{"size":"512"}}],"BW3P":["2 Games in 1 - Sonic Advance + ChuChu Rocket!",{"flash":{"size":"65536"}}],"BW4P":["2 Games in 1 - Sonic Advance + Sonic Battle",{"flash":{"size":"65536"}}],"BW5P":["2 Games in 1 - Sonic Advance + Sonic Pinball Party",{"flash":{"size":"65536"}}],"BW7P":["2 Games in 1 - Sonic Battle + ChuChu Rocket!",{"flash":{"size":"65536"}}],"BW6P":["2 Games in 1 - Sonic Battle + Sonic Pinball Party",{"flash":{"size":"65536"}}],"BW8P":["2 Games in 1 - Sonic Pinball Party + Columns Crown",{"flash":{"size":"65536"}}],"BBJP":["2 Games in 1 - SpongeBob SquarePants - Battle for Bikini Bottom + Jimmy Neutron Boy Genius",{}],"BU2E":["2 Games in 1 - SpongeBob SquarePants - Battle for Bikini Bottom + Nicktoons - Freeze Frame Frenzy",{"eeprom":{"size":"512"}}],"BX6E":["2 Games in 1 - SpongeBob SquarePants - Battle for Bikini Bottom + The Fairly OddParents! - Breakin' da Rules",{}],"BDFE":["2 Games in 1 - SpongeBob SquarePants - Revenge of the Flying Dutchman + SpongeBob SquarePants - SuperSponge",{}],"BDFP":["2 Games in 1 - SpongeBob SquarePants - Revenge of the Flying Dutchman + SpongeBob SquarePants - SuperSponge",{}],"BSZP":["2 Games in 1 - SpongeBob SquarePants - SuperSponge + SpongeBob SquarePants - Battle for Bikini Bottom",{}],"BSZX":["2 Games in 1 - SpongeBob SquarePants - SuperSponge + SpongeBob SquarePants - Battle for Bikini Bottom",{}],"BLPP":["2 Games in 1 - The Lion King + Disney Princess",{"eeprom":{"size":"512"}}],"B2BP":["2 Games in 1 - The SpongeBob SquarePants Movie + SpongeBob SquarePants and Friends in Freeze Frame Frenzy",{"eeprom":{"size":"512"}}],"BUFE":["2 Games in 1! - Dragon Ball Z - Buu's Fury + Dragon Ball GT - Transformation",{"eeprom":{"size":"8192"}}],"BZPE":["2 Games in One! - Dr. Mario + Puzzle League",{"eeprom":{"size":"512"}}],"B69E":["2 Games in One! - Gauntlet + Rampart",{}],"B69P":["2 Games in One! - Gauntlet + Rampart",{}],"B68E":["2 Games in One! - Marble Madness + Klax",{}],"B68P":["2 Games in One! - Marble Madness + Klax",{}],"B6BE":["2 Games in One! - Paperboy + Rampage",{}],"B6BP":["2 Games in One! - Paperboy + Rampage",{}],"B6AP":["2 Games in One! - Spy Hunter + Super Sprint",{}],"B6AE":["2 Games in One! - Spy Hunter + Super Sprint",{}],"B6PE":["2 Great Games! - Pac-Man World + Ms. Pac-Man - Maze Madness",{"eeprom":{"size":"512"}}],"BT5F":["2 Jeux en 1 - Titeuf - Ze Gagmachine + Titeuf - Mega Compet",{}],"B2AP":["2 in 1 - Asterix & Obelix - Bash Them All! + Asterix & Obelix XXL",{"eeprom":{"size":"512"}}],"BCSP":["2 in 1 - V-Rally 3 + Stuntman",{"eeprom":{"size":"8192"}}],"BS7P":["2 in 1 Game Pack - Shrek 2 & Shark Tale",{"eeprom":{"size":"512"}}],"BS7E":["2 in 1 Game Pack - Shrek 2 + Shark Tale",{"eeprom":{"size":"512"}}],"BX3P":["2 in 1 Game Pack - Spider-Man & Spider-Man 2",{"eeprom":{"size":"512"}}],"BX3E":["2 in 1 Game Pack - Spider-Man + Spider-Man 2",{"eeprom":{"size":"512"}}],"BX2E":["2 in 1 Game Pack - Spider-Man - Mysterio's Menace + X2 - Wolverine's Revenge",{"eeprom":{"size":"512"}}],"BX4E":["2 in 1 Game Pack - Tony Hawk's Underground + Kelly Slater's Pro Surfer",{"eeprom":{"size":"8192"}}],"BXGP":["2-in-1 Fun Pack - Shrek 2 + Madagascar",{"eeprom":{"size":"512"}}],"BXGE":["2-in-1 Fun Pack - Shrek 2 + Madagascar",{"eeprom":{"size":"512"}}],"BXHE":["2-in-1 Fun Pack - Shrek 2 + Madagascar - Operation Penguin",{"eeprom":{"size":"512"}}],"BXHP":["2-in-1 Fun Pack - Shrek 2 + Madagascar - Operation Penguin",{"eeprom":{"size":"512"}}],"B6WE":["2006 FIFA World Cup - Germany 2006",{"eeprom":{"size":"512"}}],"B2YE":["2K Sports - Major League Baseball 2K7",{}],"BC4E":["3 Game Pack! - Candy Land + Chutes and Ladders + Original Memory Game",{}],"BXCE":["3 Game Pack! - Ker Plunk! + Toss Across + Tip It",{}],"B3OE":["3 Game Pack! - Mouse Trap + Simon + Operation",{}],"B3UE":["3 Game Pack! - The Game of Life + Payday + Yahtzee",{}],"B44P":["3 Games in 1 - Rugrats - I Gotta Go Party + SpongeBob SquarePants - SuperSponge + Tak and the Power of Juju",{"eeprom":{"size":"512"}}],"B6ZE":["3 Games in One! - Breakout + Centipede + Warlords",{}],"B6ZP":["3 Games in One! - Breakout + Centipede + Warlords",{}],"B62P":["3 Games in One! - Super Breakout + Millipede + Lunar Lander",{}],"B62E":["3 Games in One! - Super Breakout + Millipede + Lunar Lander",{}],"B64P":["3 Games in One! - Yars' Revenge + Asteroids + Pong",{}],"B64E":["3 Games in One! - Yars' Revenge + Asteroids + Pong",{}],"BI7E":["4 Games on One Game Pak",{"sram":{"size":"32768"}}],"BI4E":["4 Games on One Game Pak",{"sram":{"size":"32768"}}],"AQRP":["ATV - Quad Power Racing",{}],"AQRE":["ATV - Quad Power Racing",{}],"B3BP":["ATV - Thunder Ridge Riders",{}],"B3BE":["ATV - Thunder Ridge Riders",{}],"BH5D":["Ab durch die Hecke",{"eeprom":{"size":"512"}}],"BAEE":["Ace Combat Advance",{}],"ALXP":["Ace Lightning",{"eeprom":{"size":"512"}}],"AAOJ":["Acrobat Kid",{"eeprom":{"size":"512"}}],"BACP":["Action Man - Robot Atak",{}],"BAVE":["Activision Anthology",{"eeprom":{"size":"512"}}],"A2GJ":["Advance GT2",{"eeprom":{"size":"8192"}}],"AG7J":["Advance GTA",{"sram":{"size":"32768"}}],"BGCE":["Advance Guardian Heroes",{"eeprom":{"size":"0"}}],"BGCP":["Advance Guardian Heroes",{"eeprom":{"size":"512"}}],"BAGJ":["Advance Guardian Heroes",{"eeprom":{"size":"512"}}],"AR7J":["Advance Rally",{"sram":{"size":"32768"}}],"AWRP":["Advance Wars",{"flash":{"size":"65536"}}],"AWRE":["Advance Wars",{"flash":{"size":"65536"}}],"AW2P":["Advance Wars 2 - Black Hole Rising",{"flash":{"size":"65536"}}],"AW2E":["Advance Wars 2 - Black Hole Rising",{"flash":{"size":"65536"}}],"ADEJ":["Adventure of Tokyo Disney Sea",{"sram":{"size":"32768"}}],"AJXE":["The Adventures of Jimmy Neutron Boy Genius vs. Jimmy Negatron",{}],"AJXD":["The Adventures of Jimmy Neutron Boy Genius vs. Jimmy Negatron",{}],"BJYE":["The Adventures of Jimmy Neutron Boy Genius - Attack of the Twonkies",{"eeprom":{"size":"512"}}],"BJNE":["The Adventures of Jimmy Neutron Boy Genius - Jet Fusion",{}],"AAOE":["Aero the Acro-Bat - Rascal Rival Revenge",{"eeprom":{"size":"512"}}],"AAOP":["Aero the Acro-Bat - Rascal Rival Revenge",{"eeprom":{"size":"512"}}],"ACEP":["Agassi Tennis Generation",{}],"ACEE":["Agassi Tennis Generation",{}],"BHQP":["Agent Hugo - Roborumble",{}],"AILE":["Aggressive Inline",{}],"AILP":["Aggressive Inline",{}],"ANPF":["Aigle de Guerre, L'",{"sram":{"size":"32768"}}],"AAKJ":["AirForce Delta II",{"eeprom":{"size":"512"}}],"AAKE":["AirForce Delta Storm",{"eeprom":{"size":"512"}}],"BAZJ":["Aka-chan Doubutsuen",{"eeprom":{"size":"8192"}}],"AAMJ":["Akumajou Dracula - Circle of the Moon",{"sram":{"size":"32768"}}],"BADP":["Aladdin",{"eeprom":{"size":"512"}}],"BADE":["Aladdin",{"eeprom":{"size":"512"}}],"AJ6J":["Aladdin",{"eeprom":{"size":"512"}}],"BABJ":["Aleck Bordon Adventure - Tower & Shaft Advance",{"eeprom":{"size":"512"}}],"ATFP":["Alex Ferguson's Player Manager 2002",{"eeprom":{"size":"8192"}}],"BAWE":["Alex Rider - Stormbreaker",{"eeprom":{"size":"512"}}],"BAWX":["Alex Rider - Stormbreaker",{"eeprom":{"size":"512"}}],"BAHP":["Alien Hominid",{"eeprom":{"size":"512"}}],"AEVE":["Alienators - Evolution Continues",{}],"BALE":["All Grown Up! - Express Yourself",{"eeprom":{"size":"512"}}],"AA3E":["All-Star Baseball 2003",{"sram":{"size":"32768"}}],"AA7E":["All-Star Baseball 2004",{"sram":{"size":"32768"}}],"AARE":["Altered Beast - Guardian of the Realms",{"eeprom":{"size":"512"}}],"AARP":["Altered Beast - Guardian of the Realms",{"eeprom":{"size":"512"}}],"A7ME":["The Amazing Virtual Sea-Monkeys",{}],"AABE":["American Bass Challenge",{"eeprom":{"size":"8192"}}],"BAPE":["American Dragon - Jake Long - Rise of the Huntsclan",{"eeprom":{"size":"512"}}],"BIDE":["American Idol",{}],"AFGE":["An American Tail - Fievel's Gold Rush",{}],"AFGP":["An American Tail - Fievel's Gold Rush",{}],"AFNJ":["Angel Collection - Mezase! Gakuen no Fashion Leader",{"eeprom":{"size":"8192"}}],"BECJ":["Angel Collection 2 - Pichimo ni Narou",{"eeprom":{"size":"8192"}}],"AAGJ":["Angelique",{"eeprom":{"size":"8192"}}],"AANJ":["Animal Mania - Dokidoki Aishou Check",{"sram":{"size":"32768"}}],"AAQE":["Animal Snap - Rescue Them 2 by 2",{}],"AAQP":["Animal Snap - Rescue Them 2 by 2",{}],"BAYJ":["Animal Yokochou - Doki Doki Kyushutsu Daisakusen! no Maki",{"sram":{"size":"32768"}}],"BAXJ":["Animal Yokochou - Doki Doki Shinkyuu Shiken! no Maki",{"sram":{"size":"32768"}}],"ANIP":["Animaniacs - Lights, Camera, Action!",{}],"BUYP":["The Ant Bully",{"eeprom":{"size":"512"}}],"BUYE":["The Ant Bully",{"eeprom":{"size":"512"}}],"ANZP":["Antz - Extreme Racing",{}],"ANUE":["Antz - Extreme Racing",{}],"AAZJ":["Ao-Zora to Nakama-tachi - Yume no Bouken",{"eeprom":{"size":"512"}}],"BPLE":["Archer Maclean's 3D Pool",{}],"BB5E":["Arctic Tale",{}],"AMEE":["Army Men - Operation Green",{}],"AY3E":["Army Men - Turf Wars",{"eeprom":{"size":"512"}}],"ASAE":["Army Men Advance",{}],"B8DE":["Around the World in 80 Days",{}],"B8DP":["Around the World in 80 Days",{}],"B2NE":["Arthur and the Invisibles",{"eeprom":{"size":"512"}}],"B2NP":["Arthur and the Minimoys",{"eeprom":{"size":"512"}}],"BAMJ":["Ashita no Joe - Makka ni Moeagare!",{"sram":{"size":"32768"}}],"AOBP":["Asterix & Obelix - Bash Them All!",{}],"BLXP":["Asterix & Obelix XXL",{"eeprom":{"size":"512"}}],"BTAP":["Astro Boy - Omega Factor",{"eeprom":{"size":"8192"}}],"BTAE":["Astro Boy - Omega Factor",{"eeprom":{"size":"8192"}}],"BTAJ":["Astro Boy - Tetsuwan Atom - Atom Heart no Himitsu",{"eeprom":{"size":"8192"}}],"AAVP":["Atari Anniversary Advance",{}],"AAVE":["Atari Anniversary Advance",{}],"ATLE":["Atlantis - The Lost Empire",{}],"ATLX":["Atlantis - The Lost Empire",{}],"BETE":["Atomic Betty",{}],"BQZE":["Avatar - The Last Airbender",{"eeprom":{"size":"8192"}}],"BBWE":["Avatar - The Last Airbender - The Burning Earth",{}],"BQZP":["Avatar - The Legend of Aang",{"eeprom":{"size":"8192"}}],"BBWP":["Avatar - The Legend of Aang - The Burning Earth",{}],"AJCF":["Les Aventures de Jackie Chan - La Legende de la Main Noire",{"eeprom":{"size":"512"}}],"AZAJ":["Azumanga Daiou Advance",{"eeprom":{"size":"8192"}}],"BBMJ":["B-Densetsu! Battle B-Daman - Fire Spirits!",{"eeprom":{"size":"8192"}}],"BDXJ":["B-Densetsu! Battle B-Daman - Moero! B-Damashii!!",{"eeprom":{"size":"8192"}}],"A8LJ":["BB Ball",{"sram":{"size":"32768"}}],"AT9E":["BMX Trick Racer",{"eeprom":{"size":"512"}}],"BBVP":["Babar to the Rescue",{"eeprom":{"size":"512"}}],"BBVE":["Babar to the Rescue",{"eeprom":{"size":"512"}}],"ABKE":["Back Track",{"eeprom":{"size":"512"}}],"BBCE":["Back to Stone",{}],"BBCP":["Back to Stone",{}],"ACKE":["Backyard Baseball",{"eeprom":{"size":"512"}}],"BCYE":["Backyard Baseball 2006",{"eeprom":{"size":"512"}}],"AYBE":["Backyard Basketball",{"eeprom":{"size":"512"}}],"AYFE":["Backyard Football",{"eeprom":{"size":"512"}}],"BYFE":["Backyard Football 2006",{"eeprom":{"size":"512"}}],"BYHE":["Backyard Hockey",{"eeprom":{"size":"512"}}],"BS6E":["Backyard Skateboarding",{"eeprom":{"size":"512"}}],"BC7E":["Backyard Sports - Baseball 2007",{"eeprom":{"size":"512"}}],"BB7E":["Backyard Sports - Basketball 2007",{"eeprom":{"size":"512"}}],"BF7E":["Backyard Sports - Football 2007",{"eeprom":{"size":"512"}}],"ADFJ":["Bakunetsu Dodge Ball Fighters",{"sram":{"size":"32768"}}],"AHEJ":["Bakuten Shoot Beyblade - Gekitou! Saikyou Blader",{"sram":{"size":"32768"}}],"A3EJ":["Bakuten Shoot Beyblade 2002 - Gekisen! Team Battle!! Kouryuu no Shou - Daichi Hen",{"sram":{"size":"32768"}}],"A3WJ":["Bakuten Shoot Beyblade 2002 - Gekisen! Team Battle!! Seiryuu no Shou - Takao Hen",{"sram":{"size":"32768"}}],"AB8J":["Bakuten Shoot Beyblade 2002 - Ikuze! Bakutou! Chou Jiryoku Battle!!",{"sram":{"size":"32768"}}],"BGDP":["Baldur's Gate - Dark Alliance",{"eeprom":{"size":"512"}}],"BGDE":["Baldur's Gate - Dark Alliance",{"eeprom":{"size":"512"}}],"AEEE":["Ballistic - Ecks vs Sever",{}],"BKZE":["Banjo-Kazooie - Grunty's Revenge",{"eeprom":{"size":"8192"}}],"BKZX":["Banjo-Kazooie - Grunty's Revenge",{"eeprom":{"size":"8192"}}],"BKZI":["Banjo-Kazooie - La Vendetta di Grunty",{"eeprom":{"size":"8192"}}],"BKZS":["Banjo-Kazooie - La Venganza de Grunty",{"eeprom":{"size":"8192"}}],"BAJE":["Banjo-Pilot",{"eeprom":{"size":"512"}}],"BAJP":["Banjo-Pilot",{"eeprom":{"size":"512"}}],"BAUP":["Barbie - The Princess and the Pauper",{}],"BAUE":["Barbie - The Princess and the Pauper",{}],"BBIP":["The Barbie Diaries - High School Mystery",{"eeprom":{"size":"512"}}],"BBIE":["The Barbie Diaries - High School Mystery",{"eeprom":{"size":"512"}}],"AVBP":["Barbie Groovy Games",{}],"AVBE":["Barbie Groovy Games",{}],"AI8P":["Barbie Horse Adventures",{}],"AI8E":["Barbie Horse Adventures - Blue Ribbon Race",{}],"BBEE":["Barbie Superpack",{}],"BBEP":["Barbie Superpack",{}],"BE5E":["Barbie and the Magic of Pegasus",{}],"BE5P":["Barbie and the Magic of Pegasus",{}],"BBNE":["Barbie as the Island Princess",{"eeprom":{"size":"512"}}],"BB3E":["Barbie in the 12 Dancing Princesses",{}],"BB3P":["Barbie in the 12 Dancing Princesses",{}],"BBYX":["Barnyard",{"eeprom":{"size":"8192"}}],"BBYE":["Barnyard",{"eeprom":{"size":"8192"}}],"ABPE":["Baseball Advance",{"sram":{"size":"32768"}}],"AZBJ":["Bass Tsuri Shiyouze! - Tournament wa Senryaku da!",{"eeprom":{"size":"8192"}}],"BATE":["Batman - Rise of Sin Tzu",{}],"ABTE":["Batman - Vengeance",{}],"ABTP":["Batman - Vengeance",{}],"BBGE":["Batman Begins",{"eeprom":{"size":"512"}}],"BDXE":["Battle B-Daman",{"eeprom":{"size":"8192"}}],"BBME":["Battle B-Daman - Fire Spirits!",{"eeprom":{"size":"8192"}}],"AREJ":["Battle Network Rockman EXE",{"sram":{"size":"32768"}}],"AE2J":["Battle Network Rockman EXE 2",{"sram":{"size":"32768"}}],"A6BJ":["Battle Network Rockman EXE 3",{"sram":{"size":"32768"}}],"A3XJ":["Battle Network Rockman EXE 3 - Black",{"sram":{"size":"32768"}}],"BBFJ":["Battle X Battle - Kyodai Gyo Densetsu",{"eeprom":{"size":"512"}}],"ABEE":["BattleBots - Beyond the BattleBox",{"eeprom":{"size":"512"}}],"ABEP":["BattleBots - Beyond the BattleBox",{"eeprom":{"size":"512"}}],"BBDE":["BattleBots - Design & Destroy",{}],"AH5J":["Beast Shooter - Mezase Beast King!",{"sram":{"size":"32768"}}],"BKFE":["The Bee Game",{"eeprom":{"size":"512"}}],"BBOE":["The Berenstain Bears and the Spooky Old Tree",{}],"BHBP":["Best Friends - Hunde & Katzen",{"eeprom":{"size":"8192"}}],"A8YJ":["Best Play Pro Yakyuu",{"flash":{"size":"65536"}}],"BB2P":["Beyblade G-Revolution",{"eeprom":{"size":"8192"}}],"BB2E":["Beyblade G-Revolution",{"eeprom":{"size":"8192"}}],"BEYP":["Beyblade V-Force - Ultimate Blader Jam",{"eeprom":{"size":"8192"}}],"BEYE":["Beyblade V-Force - Ultimate Blader Jam",{"eeprom":{"size":"8192"}}],"BBXD":["Bibi Blocksberg - Der Magische Hexenkreis",{}],"BUXD":["Bibi und Tina - Ferien auf dem Martinshof",{"eeprom":{"size":"512"}}],"BIBE":["The Bible Game",{}],"BKFX":["Die Biene Maja - Klatschmohnwiese in Gefahr",{"eeprom":{"size":"512"}}],"B63E":["Big Mutha Truckers",{"eeprom":{"size":"512"}}],"B63P":["Big Mutha Truckers",{"eeprom":{"size":"512"}}],"BIOE":["Bionicle",{}],"BIOP":["Bionicle",{}],"A5AE":["Bionicle - Matoran Adventures",{"eeprom":{"size":"512"}}],"BILP":["Bionicle - Maze of Shadows",{"eeprom":{"size":"512"}}],"BILE":["Bionicle - Maze of Shadows",{"eeprom":{"size":"512"}}],"BIHE":["Bionicle Heroes",{"eeprom":{"size":"512"}}],"BIHP":["Bionicle Heroes",{"eeprom":{"size":"512"}}],"AB6P":["Black Belt Challenge",{"eeprom":{"size":"512"}}],"AWEJ":["Black Black - Bura Bura",{"sram":{"size":"32768"}}],"AXBJ":["Black Matrix Zero",{"eeprom":{"size":"8192"}}],"AQXE":["Blackthorne",{"eeprom":{"size":"512"}}],"AQXP":["Blackthorne",{"eeprom":{"size":"512"}}],"BBHE":["Blades of Thunder",{}],"BLEJ":["Bleach Advance - Kurenai ni Somaru Soul Society",{"flash":{"size":"65536"}}],"ABRE":["Blender Bros.",{"sram":{"size":"32768"}}],"B6EP":["Board Game Classics",{}],"B6EE":["Board Game Classics",{}],"BB9J":["Boboboubo Boubobo - 9 Kyoku Senshi Gag Yuugou",{"sram":{"size":"32768"}}],"BOSJ":["Boboboubo Boubobo - Bakutou Hajike Taisen",{"sram":{"size":"32768"}}],"BOBJ":["Boboboubo Boubobo - Maji de!! Shinken Battle",{"sram":{"size":"32768"}}],"A8VJ":["Boboboubo Boubobo - Ougi 87.5 Bakuretsu Hanage Shinken",{"sram":{"size":"32768"}}],"U3IE":["Boktai - The Sun Is in Your Hand",{"eeprom":{"size":"8192"},"hasRTC":true}],"U3IP":["Boktai - The Sun Is in Your Hand",{"eeprom":{"size":"8192"},"hasRTC":true}],"U32E":["Boktai 2 - Solar Boy Django",{"eeprom":{"size":"8192"},"hasRTC":true}],"U32P":["Boktai 2 - Solar Boy Django",{"eeprom":{"size":"8192"},"hasRTC":true}],"ABCJ":["Boku wa Koukuu Kanseikan",{"sram":{"size":"32768"}}],"A4NJ":["Bokujou Monogatari - Mineral Town no Nakama-tachi",{"sram":{"size":"32768"}}],"BFGJ":["Bokujou Monogatari - Mineral Town no Nakama-tachi for Girl",{"sram":{"size":"32768"}}],"U3IJ":["Bokura no Taiyou - Taiyou Action RPG",{"eeprom":{"size":"8192"},"hasRTC":true}],"AJZJ":["Bomber Man Jetters - Densetsu no Bomber Man",{"sram":{"size":"32768"}}],"BOMJ":["Bomber Man Jetters - Game Collection",{"eeprom":{"size":"512"}}],"AMHJ":["Bomber Man Max 2 - Bomber Man Version",{"sram":{"size":"32768"}}],"AMYJ":["Bomber Man Max 2 - Max Version",{"eeprom":{"size":"8192"}}],"ABSJ":["Bomber Man Story",{"sram":{"size":"32768"}}],"AMHE":["Bomberman Max 2 - Blue Advance",{"eeprom":{"size":"8192"}}],"AMHP":["Bomberman Max 2 - Blue Advance",{"eeprom":{"size":"8192"}}],"AMYE":["Bomberman Max 2 - Red Advance",{"eeprom":{"size":"8192"}}],"AMYP":["Bomberman Max 2 - Red Advance",{"eeprom":{"size":"8192"}}],"ABSE":["Bomberman Tournament",{"sram":{"size":"32768"}}],"BKWE":["Bookworm",{"eeprom":{"size":"512"}}],"APJJ":["Bouken Yuuki Pluster World - Densetsu no Plust Gate",{"sram":{"size":"32768"}}],"BPDJ":["Bouken Yuuki Pluster World - Densetsu no Plust Gate EX",{"sram":{"size":"32768"}}],"A2PJ":["Bouken Yuuki Pluster World - Pluston GP",{"sram":{"size":"32768"}}],"BOVJ":["Bouken-ou Beet - Busters Road",{"eeprom":{"size":"8192"}}],"BBSJ":["Boukyaku no Senritsu",{"eeprom":{"size":"8192"}}],"ABDP":["Boulder Dash EX",{"eeprom":{"size":"512"}}],"ABDE":["Boulder Dash EX",{"eeprom":{"size":"512"}}],"ABDJ":["Boulder Dash EX",{"eeprom":{"size":"512"}}],"ABOE":["Boxing Fever",{}],"A2RE":["Bratz",{"eeprom":{"size":"512"}}],"A2RP":["Bratz",{"eeprom":{"size":"512"}}],"BBZE":["Bratz - Babyz",{}],"BBZP":["Bratz - Babyz",{}],"BXFP":["Bratz - Forever Diamondz",{"eeprom":{"size":"8192"}}],"BXFD":["Bratz - Forever Diamondz",{"eeprom":{"size":"8192"}}],"BXFE":["Bratz - Forever Diamondz",{"eeprom":{"size":"8192"}}],"BRRD":["Bratz - Rock Angelz",{"eeprom":{"size":"512"}}],"BRRF":["Bratz - Rock Angelz",{"eeprom":{"size":"512"}}],"BRRE":["Bratz - Rock Angelz",{"eeprom":{"size":"512"}}],"BRRS":["Bratz - Rock Angelz",{"eeprom":{"size":"512"}}],"BBUP":["Bratz - The Movie",{}],"BBUX":["Bratz - The Movie",{}],"BBUD":["Bratz - The Movie",{}],"BBUE":["Bratz - The Movie",{}],"ABFX":["Breath of Fire",{"sram":{"size":"32768"}}],"ABFP":["Breath of Fire",{"sram":{"size":"32768"}}],"ABFE":["Breath of Fire",{"sram":{"size":"32768"}}],"ABFJ":["Breath of Fire - Ryuu no Senshi",{"sram":{"size":"32768"}}],"AB2E":["Breath of Fire II",{"sram":{"size":"32768"}}],"AB2P":["Breath of Fire II",{"sram":{"size":"32768"}}],"AB2J":["Breath of Fire II - Shimei no Ko",{"sram":{"size":"32768"}}],"ABYE":["Britney's Dance Beat",{}],"ABYP":["Britney's Dance Beat",{}],"ABYY":["Britney's Dance Beat",{}],"ABYX":["Britney's Dance Beat",{}],"ABJE":["Broken Sword - The Shadow of the Templars",{"eeprom":{"size":"8192"}}],"ABJP":["Broken Sword - The Shadow of the Templars",{"eeprom":{"size":"8192"}}],"BBRX":["Brother Bear",{"eeprom":{"size":"512"}}],"BBRP":["Brother Bear",{"eeprom":{"size":"512"}}],"BBRE":["Brother Bear",{"eeprom":{"size":"8192"}}],"ALEE":["Bruce Lee - Return of the Legend",{"eeprom":{"size":"512"}}],"ALEP":["Bruce Lee - Return of the Legend",{"eeprom":{"size":"512"}}],"AONE":["Bubble Bobble - Old & New",{"eeprom":{"size":"512"}}],"AONP":["Bubble Bobble - Old & New",{"eeprom":{"size":"512"}}],"A2BJ":["Bubble Bobble - Old & New",{"eeprom":{"size":"512"}}],"AVYD":["Buffy - Im Bann der Daemonen - Koenig Darkhuls Zorn",{"eeprom":{"size":"512"}}],"AVYF":["Buffy contre les Vampires - La Colere de Darkhul",{"eeprom":{"size":"512"}}],"AVYE":["Buffy the Vampire Slayer - Wrath of the Darkhul King",{"eeprom":{"size":"512"}}],"BBKJ":["Bura Bura Donkey",{"sram":{"size":"32768"}}],"ABWE":["Butt-Ugly Martians - B.K.M. Battles",{}],"AUQP":["Butt-Ugly Martians - B.K.M. Battles",{}],"BCME":["CIMA - The Enemy",{"eeprom":{"size":"8192"}}],"AC7P":["CT Special Forces",{}],"AC7E":["CT Special Forces",{}],"A9CP":["CT Special Forces - Back to Hell",{}],"BC3P":["CT Special Forces - Bioterror",{}],"A9CE":["CT Special Forces 2 - Back in the Trenches",{}],"BCGP":["Cabbage Patch Kids - The Patch Puppy Rescue",{"eeprom":{"size":"512"}}],"BCGE":["Cabbage Patch Kids - The Patch Puppy Rescue",{"eeprom":{"size":"512"}}],"A8HE":["Cabela's Big Game Hunter",{}],"BG5E":["Cabela's Big Game Hunter - 2005 Adventures",{"eeprom":{"size":"512"}}],"ACPE":["Caesars Palace Advance - Millennium Gold Edition",{}],"BIXJ":["Calciobit",{"flash":{"size":"131072"}}],"BLCP":["Camp Lazlo - Leaky Lake Games",{"eeprom":{"size":"512"}}],"BLCE":["Camp Lazlo - Leaky Lake Games",{"eeprom":{"size":"512"}}],"BC6E":["Capcom Classics Mini Mix",{}],"AKYJ":["Captain Tsubasa - Eikou no Kiseki",{"sram":{"size":"32768"}}],"ACBE":["Car Battler Joe",{"eeprom":{"size":"8192"}}],"A8CJ":["Card Party",{}],"BKSJ":["Cardcaptor Sakura - Sakura Card Hen - Sakura to Card to Otomodachi",{"eeprom":{"size":"512"}}],"BK3J":["Cardcaptor Sakura - Sakura Card de Mini Game",{"eeprom":{"size":"8192"}}],"BEAP":["Care Bears - The Care Quests",{"eeprom":{"size":"512"}}],"BEAE":["Care Bears - The Care Quests",{"eeprom":{"size":"512"}}],"AEDP":["Carrera Power Slide",{"eeprom":{"size":"512"}}],"BCAJ":["Cars",{"eeprom":{"size":"512"}}],"BCAZ":["Cars",{"eeprom":{"size":"512"}}],"BCAY":["Cars",{"eeprom":{"size":"512"}}],"BCAD":["Cars",{"eeprom":{"size":"512"}}],"BCAX":["Cars",{"eeprom":{"size":"512"}}],"BCAE":["Cars",{"eeprom":{"size":"512"}}],"BCPE":["Cars - Mater-National Championship",{}],"BCPP":["Cars - Mater-National Championship",{}],"BCAI":["Cars - Motori Ruggenti",{"eeprom":{"size":"512"}}],"AC9E":["Cartoon Network Block Party",{}],"ANRE":["Cartoon Network Speedway",{}],"ACSP":["Casper",{}],"ACSE":["Casper",{}],"AAMP":["Castlevania",{"sram":{"size":"32768"}}],"A2CJ":["Castlevania - Akatsuki no Minuet",{"sram":{"size":"32768"}}],"A2CP":["Castlevania - Aria of Sorrow",{"sram":{"size":"32768"}}],"A2CE":["Castlevania - Aria of Sorrow",{"sram":{"size":"32768"}}],"ACHJ":["Castlevania - Byakuya no Concerto",{"sram":{"size":"32768"}}],"AAME":["Castlevania - Circle of the Moon",{"sram":{"size":"32768"}}],"ACHP":["Castlevania - Harmony of Dissonance",{"sram":{"size":"32768"}}],"ACHE":["Castlevania - Harmony of Dissonance",{"sram":{"size":"32768"}}],"BXKE":["Castlevania Double Pack",{"sram":{"size":"32768"}}],"BXKP":["Castlevania Double Pack",{"sram":{"size":"32768"}}],"AWNP":["Castleween",{}],"BCTE":["The Cat in the Hat by Dr. Seuss",{}],"BCWE":["Catwoman",{"eeprom":{"size":"512"}}],"AN3X":["Catz",{"eeprom":{"size":"8192"}}],"AN3E":["Catz",{"eeprom":{"size":"8192"}}],"AMAC":["Chaoji Maliou 2",{"eeprom":{"size":"512"}}],"AA2C":["Chaoji Maliou Shijie",{"eeprom":{"size":"8192"}}],"BCFE":["Charlie and the Chocolate Factory",{"eeprom":{"size":"512"}}],"BCFP":["Charlie and the Chocolate Factory",{"eeprom":{"size":"512"}}],"BCJP":["Charlotte's Web",{"eeprom":{"size":"512"}}],"BCJE":["Charlotte's Web",{"eeprom":{"size":"512"}}],"BCQE":["The Cheetah Girls",{"eeprom":{"size":"512"}}],"ACYP":["Chessmaster",{"eeprom":{"size":"512"}}],"ACYE":["Chessmaster",{"eeprom":{"size":"512"}}],"ACYF":["Chessmaster",{"eeprom":{"size":"512"}}],"ACYD":["Chessmaster",{"eeprom":{"size":"512"}}],"A55I":["Chi Vuol Essere Milionario",{}],"BCHJ":["Chicken Little",{"eeprom":{"size":"512"}}],"BCHE":["Chicken Little",{"eeprom":{"size":"512"}}],"B6FP":["Chicken Shoot",{}],"B6FE":["Chicken Shoot",{}],"B6GE":["Chicken Shoot 2",{}],"B6GP":["Chicken Shoot 2",{}],"AGDJ":["Chinmoku no Iseki - Estpolis Gaiden",{"sram":{"size":"32768"}}],"AOCJ":["Chobits for Game Boy Advance - Atashi Dake no Hito",{"eeprom":{"size":"512"}}],"A5BJ":["Chocobo Land - A Game of Dice",{"sram":{"size":"32768"}}],"AQAJ":["Choro Q Advance",{"sram":{"size":"32768"}}],"AQ2J":["Choro Q Advance 2",{"sram":{"size":"32768"}}],"ACJJ":["Chou Makai Mura R",{"eeprom":{"size":"512"}}],"B2WE":["The Chronicles of Narnia - The Lion, the Witch and the Wardrobe",{"eeprom":{"size":"512"}}],"ACRJ":["ChuChu Rocket!",{"flash":{"size":"65536"}}],"ACRP":["ChuChu Rocket!",{"flash":{"size":"65536"}}],"ACRE":["ChuChu Rocket!",{"flash":{"size":"65536"}}],"BCDE":["Cinderella - Magical Dreams",{"eeprom":{"size":"512"}}],"BCDP":["Cinderella - Magical Dreams",{"eeprom":{"size":"512"}}],"B2SJ":["Cinnamon Game Series 2 - Yume no Daibouken",{"eeprom":{"size":"512"}}],"B43J":["Cinnamon Game Series 3 - Fuwafuwa Daibouken",{"eeprom":{"size":"512"}}],"BPSJ":["Cinnamoroll - Koko ni Iru yo",{"eeprom":{"size":"512"}}],"FBME":["Classic NES Series - Bomberman",{"eeprom":{"size":"512"},"isMirrored":true}],"FADE":["Classic NES Series - Castlevania",{"eeprom":{"size":"512"},"isMirrored":true}],"FDKE":["Classic NES Series - Donkey Kong",{"eeprom":{"size":"512"},"isMirrored":true}],"FDME":["Classic NES Series - Dr. Mario",{"eeprom":{"size":"512"},"isMirrored":true}],"FEBE":["Classic NES Series - Excitebike",{"eeprom":{"size":"8192"},"isMirrored":true}],"FICE":["Classic NES Series - Ice Climber",{"eeprom":{"size":"512"},"isMirrored":true}],"FZLE":["Classic NES Series - Legend of Zelda",{"eeprom":{"size":"8192"},"isMirrored":true}],"FMRE":["Classic NES Series - Metroid",{"eeprom":{"size":"512"},"isMirrored":true}],"FP7E":["Classic NES Series - Pac-Man",{"eeprom":{"size":"512"},"isMirrored":true}],"FSME":["Classic NES Series - Super Mario Bros.",{"eeprom":{"size":"8192"},"isMirrored":true}],"FXVE":["Classic NES Series - Xevious",{"eeprom":{"size":"512"},"isMirrored":true}],"FLBE":["Classic NES Series - Zelda II - The Adventure of Link",{"eeprom":{"size":"8192"},"isMirrored":true}],"BC5P":["Cocoto - Kart Racer",{}],"BC8P":["Cocoto - Platform Jumper",{}],"BNDE":["Codename - Kids Next Door - Operation S.O.D.A.",{}],"ACMP":["Colin McRae Rally 2.0",{"eeprom":{"size":"512"}}],"ACME":["Colin McRae Rally 2.0",{"eeprom":{"size":"512"}}],"ACGJ":["Columns Crown",{"eeprom":{"size":"512"}}],"ACGE":["Columns Crown",{"eeprom":{"size":"512"}}],"ACGP":["Columns Crown",{"eeprom":{"size":"512"}}],"AQCJ":["Combat Choro Q - Advance Daisakusen",{"sram":{"size":"32768"}}],"BW5E":["Combo Pack - Sonic Advance + Sonic Pinball Party",{"flash":{"size":"65536"}}],"ACZP":["Comix Zone",{"eeprom":{"size":"512"}}],"AAWE":["Contra Advance - The Alien Wars EX",{}],"AAWP":["Contra Advance - The Alien Wars EX",{}],"AAWJ":["Contra Hard Spirits",{}],"AVCE":["Corvette",{"eeprom":{"size":"512"}}],"BF2D":["Cosmo & Wanda - Wenn Elfen Helfen! - Das Schattenduell",{}],"B5AP":["Crash & Spyro Super Pack Volume 1",{"eeprom":{"size":"512"}}],"B52P":["Crash & Spyro Super Pack Volume 2",{"eeprom":{"size":"512"}}],"B53P":["Crash & Spyro Super Pack Volume 3",{"eeprom":{"size":"8192"}}],"B54E":["Crash & Spyro Superpack - Spyro - Season of Ice + Crash Bandicoot - The Huge Adventure",{"eeprom":{"size":"512"}}],"B53E":["Crash & Spyro Superpack - Spyro Orange - The Cortex Conspiracy + Crash Bandicoot Purple - Ripto's Rampage",{"eeprom":{"size":"512"}}],"ACQE":["Crash Bandicoot - The Huge Adventure",{"eeprom":{"size":"512"}}],"AC8P":["Crash Bandicoot 2 - N-Tranced",{"eeprom":{"size":"512"}}],"AC8E":["Crash Bandicoot 2 - N-Tranced",{"eeprom":{"size":"512"}}],"ACUJ":["Crash Bandicoot Advance",{"eeprom":{"size":"512"}}],"BKDJ":["Crash Bandicoot Advance - Wakuwaku Tomodachi Daisakusen!",{"eeprom":{"size":"512"}}],"AC8J":["Crash Bandicoot Advance 2 - Guruguru Saimin Dai-panic!",{"eeprom":{"size":"512"}}],"BCNJ":["Crash Bandicoot Bakusou Nitro Cart",{"eeprom":{"size":"512"}}],"BD4P":["Crash Bandicoot Fusion",{"eeprom":{"size":"512"}}],"BD4E":["Crash Bandicoot Purple - Ripto's Rampage",{"eeprom":{"size":"512"}}],"ACQP":["Crash Bandicoot XS",{"eeprom":{"size":"512"}}],"BCNE":["Crash Nitro Kart",{"eeprom":{"size":"512"}}],"BCNP":["Crash Nitro Kart",{"eeprom":{"size":"512"}}],"B8AE":["Crash Superpack",{"eeprom":{"size":"8192"}}],"BQCP":["Crash of the Titans",{"eeprom":{"size":"512"}}],"BQCE":["Crash of the Titans",{"eeprom":{"size":"512"}}],"BKCJ":["Crayon Shin-chan - Arashi o Yobu Cinemaland no Daibouken!",{"eeprom":{"size":"512"}}],"BC2J":["Crayon Shin-chan - Densetsu o Yobu Omake no Miyako Shockgaan!",{"eeprom":{"size":"8192"}}],"ACCE":["Crazy Chase",{"eeprom":{"size":"512"}}],"ACCP":["Crazy Chase",{"eeprom":{"size":"512"}}],"BCRP":["Crazy Frog Racer",{"eeprom":{"size":"512"}}],"A3CP":["Crazy Taxi - Catch a Ride",{"eeprom":{"size":"512"}}],"A3CE":["Crazy Taxi - Catch a Ride",{"eeprom":{"size":"512"}}],"ACTX":["Creatures",{"eeprom":{"size":"8192"}}],"ACTY":["Creatures",{"eeprom":{"size":"8192"}}],"A6CJ":["Croket! - Yume no Banker Survival!",{"sram":{"size":"32768"}}],"BK2J":["Croket! 2 - Yami no Bank to Banqueen",{"sram":{"size":"32768"}}],"B3KJ":["Croket! 3 - Granu Oukoku no Nazo",{"sram":{"size":"32768"}}],"BK4J":["Croket! 4 - Bank no Mori no Mamorigami",{"sram":{"size":"32768"}}],"BK5J":["Croket! Great - Toki no Boukensha",{"sram":{"size":"32768"}}],"AQDP":["Crouching Tiger, Hidden Dragon",{}],"AQDE":["Crouching Tiger, Hidden Dragon",{}],"ACFE":["Cruis'n Velocity",{}],"BCBE":["Crushed Baseball",{"eeprom":{"size":"512"}}],"ACXE":["Cubix - Robots for Everyone - Clash 'N Bash",{"eeprom":{"size":"512"}}],"B3JP":["Curious George",{}],"B3JE":["Curious George",{}],"ARJJ":["Custom Robo GX",{"eeprom":{"size":"8192"}}],"AZ3J":["Cyberdrive Zoids - Kijuu no Senshi Hyuu",{"sram":{"size":"32768"}}],"BBKE":["DK - King of Swing",{"sram":{"size":"32768"}}],"BBKP":["DK - King of Swing",{"sram":{"size":"32768"}}],"AHMJ":["Dai-mahjong.",{"eeprom":{"size":"512"}}],"ADSJ":["Daisenryaku for Game Boy Advance",{"flash":{"size":"65536"}}],"ATDJ":["Daisuki Teddy",{"sram":{"size":"32768"}}],"BDNJ":["Dan Doh!! Tobase Shouri no Smile Shot",{"sram":{"size":"32768"}}],"AXHJ":["Dan Doh!! Xi",{"sram":{"size":"32768"}}],"A9SJ":["Dancing Sword - Senkou",{"eeprom":{"size":"512"}}],"BQYD":["Danny Phantom - Dschungelstadt",{"eeprom":{"size":"512"}}],"BUEP":["Danny Phantom - The Ultimate Enemy",{"eeprom":{"size":"512"}}],"BUEX":["Danny Phantom - The Ultimate Enemy",{"eeprom":{"size":"512"}}],"BUEE":["Danny Phantom - The Ultimate Enemy",{"eeprom":{"size":"512"}}],"BQYE":["Danny Phantom - Urban Jungle",{"eeprom":{"size":"512"}}],"AVLD":["Daredevil",{}],"AVLE":["Daredevil",{}],"AVLX":["Daredevil",{}],"A2DJ":["Darius R",{"eeprom":{"size":"512"}}],"ADAE":["Dark Arena",{}],"AX2E":["Dave Mirra Freestyle BMX 2",{"eeprom":{"size":"8192"}}],"AX2P":["Dave Mirra Freestyle BMX 2",{"eeprom":{"size":"8192"}}],"AB3E":["Dave Mirra Freestyle BMX 3",{"eeprom":{"size":"8192"}}],"ABQP":["David Beckham Soccer",{"eeprom":{"size":"512"}}],"ABQE":["David Beckham Soccer",{"eeprom":{"size":"512"}}],"AD6E":["Davis Cup",{"eeprom":{"size":"512"}}],"AD6P":["Davis Cup",{"eeprom":{"size":"512"}}],"BDEP":["Dead to Rights",{}],"BDEE":["Dead to Rights",{}],"AAKP":["Deadly Skies",{"eeprom":{"size":"512"}}],"BZNE":["Deal or No Deal",{}],"A2FE":["Defender",{"eeprom":{"size":"512"}}],"A2FP":["Defender - For All Mankind",{"eeprom":{"size":"512"}}],"ADHP":["Defender of the Crown",{"eeprom":{"size":"512"}}],"ADHE":["Defender of the Crown",{"eeprom":{"size":"512"}}],"AC5E":["DemiKids - Dark Version",{"sram":{"size":"32768"}}],"AL4E":["DemiKids - Light Version",{"sram":{"size":"32768"}}],"A9AP":["Demon Driver - Time to Burn Rubber!",{}],"A9AE":["Demon Driver - Time to Burn Rubber!",{}],"ADBE":["Denki Blocks!",{"eeprom":{"size":"512"}}],"ADBP":["Denki Blocks!",{"eeprom":{"size":"512"}}],"ADBJ":["Denki Blocks!",{"eeprom":{"size":"512"}}],"ASTJ":["Densetsu no Stafy",{"sram":{"size":"32768"}}],"AVFJ":["Densetsu no Stafy 2",{"sram":{"size":"32768"}}],"B3DJ":["Densetsu no Stafy 3",{"sram":{"size":"32768"}}],"A8PJ":["Derby Stallion Advance",{"flash":{"size":"65536"}}],"ADIE":["Desert Strike Advance",{}],"BIDD":["Deutschland Sucht den Superstar",{}],"ADXE":["Dexter's Laboratory - Chess Challenge",{}],"ADXP":["Dexter's Laboratory - Chess Challenge",{}],"ADLE":["Dexter's Laboratory - Deesaster Strikes!",{"eeprom":{"size":"512"}}],"ADLP":["Dexter's Laboratory - Deesaster Strikes!",{"eeprom":{"size":"512"}}],"A3OJ":["Di Gi Charat - DigiCommunication",{"sram":{"size":"32768"}}],"ADDJ":["Diadroids World - Evil Teikoku no Yabou",{"eeprom":{"size":"8192"}}],"BDKJ":["DigiCommunication Nyo - Datou! Black Gemagema Dan",{}],"A8SP":["Digimon - Battle Spirit",{"eeprom":{"size":"512"}}],"A8SE":["Digimon - Battle Spirit",{"eeprom":{"size":"512"}}],"BDSE":["Digimon - Battle Spirit 2",{"eeprom":{"size":"512"}}],"BDSP":["Digimon - Battle Spirit 2",{"eeprom":{"size":"512"}}],"BDGP":["Digimon Racing",{"eeprom":{"size":"512"}}],"BDJJ":["Digimon Racing",{"eeprom":{"size":"512"}}],"BDGE":["Digimon Racing",{"eeprom":{"size":"512"}}],"AD3E":["Dinotopia - The Timestone Pirates",{"eeprom":{"size":"512"}}],"AQDS":["Disney Princesas",{}],"AQPE":["Disney Princess",{}],"BQNE":["Disney Princess - Royal Adventure",{"eeprom":{"size":"512"}}],"BQNP":["Disney Princess - Royal Adventure",{"eeprom":{"size":"512"}}],"AQPF":["Disney Princesse",{}],"AQPI":["Disney Principesse",{}],"A3DJ":["Disney Sports - American Football",{"eeprom":{"size":"512"}}],"A2AP":["Disney Sports - Basketball",{"eeprom":{"size":"512"}}],"A2AJ":["Disney Sports - Basketball",{"eeprom":{"size":"512"}}],"A2AE":["Disney Sports - Basketball",{"eeprom":{"size":"512"}}],"A6DP":["Disney Sports - Football",{"eeprom":{"size":"512"}}],"A3DE":["Disney Sports - Football",{"eeprom":{"size":"512"}}],"AOMJ":["Disney Sports - Motocross",{"eeprom":{"size":"512"}}],"AOMP":["Disney Sports - Motocross",{"eeprom":{"size":"512"}}],"AOME":["Disney Sports - Motocross",{"eeprom":{"size":"512"}}],"A4DJ":["Disney Sports - Skateboarding",{"eeprom":{"size":"512"}}],"A4DP":["Disney Sports - Skateboarding",{"eeprom":{"size":"512"}}],"A4DE":["Disney Sports - Skateboarding",{"eeprom":{"size":"512"}}],"A5DP":["Disney Sports - Snowboarding",{"eeprom":{"size":"512"}}],"A5DE":["Disney Sports - Snowboarding",{"eeprom":{"size":"512"}}],"A5DJ":["Disney Sports - Snowboarding",{"eeprom":{"size":"512"}}],"A6DE":["Disney Sports - Soccer",{"eeprom":{"size":"8192"}}],"A6DJ":["Disney Sports - Soccer",{"eeprom":{"size":"512"}}],"BL4E":["Disney's Game + TV Episode - Lizzie McGuire 2 - Lizzie Diaries",{"flash":{"size":"65536"}}],"BD8E":["Disney's Party",{"eeprom":{"size":"512"}}],"AQPD":["Disneys Prinzessinnen",{}],"B82X":["Dogz",{"eeprom":{"size":"8192"}}],"B82P":["Dogz",{"eeprom":{"size":"512"}}],"B82Y":["Dogz",{"eeprom":{"size":"512"}}],"B82E":["Dogz",{"eeprom":{"size":"512"}}],"BFEP":["Dogz - Fashion",{"eeprom":{"size":"8192"}}],"BFEE":["Dogz - Fashion",{"eeprom":{"size":"8192"}}],"BIMX":["Dogz 2",{"eeprom":{"size":"8192"}}],"BIME":["Dogz 2",{"eeprom":{"size":"8192"}}],"BIMP":["Dogz 2",{"eeprom":{"size":"8192"}}],"ADQE":["Dokapon",{"sram":{"size":"32768"}}],"ADQP":["Dokapon",{"sram":{"size":"32768"}}],"ADQJ":["Dokapon Q - Monster Hunter!",{"sram":{"size":"32768"}}],"A56J":["Dokidoki Cooking Series 1 - Komugi-chan no Happy Cake",{"eeprom":{"size":"8192"}}],"A8OJ":["Dokidoki Cooking Series 2 - Gourmet Kitchen - Suteki na Obentou",{"eeprom":{"size":"8192"}}],"AYAJ":["Dokodemo Taikyoku - Yakuman Advance",{"sram":{"size":"32768"}}],"ADOJ":["Domo-kun no Fushigi Television",{"sram":{"size":"32768"}}],"ADKP":["Donald Duck Advance",{}],"ADKE":["Donald Duck Advance",{}],"AADJ":["Donald Duck Advance",{}],"BDAJ":["Donchan Puzzle Hanabi de Dohn Advance",{"eeprom":{"size":"512"}}],"A5NE":["Donkey Kong Country",{"eeprom":{"size":"512"}}],"A5NP":["Donkey Kong Country",{"eeprom":{"size":"512"}}],"B2DP":["Donkey Kong Country 2",{"eeprom":{"size":"8192"}}],"B2DE":["Donkey Kong Country 2",{"eeprom":{"size":"8192"}}],"BDQE":["Donkey Kong Country 3",{"eeprom":{"size":"512"}}],"BDQP":["Donkey Kong Country 3",{"eeprom":{"size":"512"}}],"ADME":["Doom",{"eeprom":{"size":"512"}}],"A9DE":["Doom II",{"eeprom":{"size":"512"}}],"A9DP":["Doom II",{"eeprom":{"size":"512"}}],"BXPE":["Dora the Explorer - Dora's World Adventure!",{}],"BERE":["Dora the Explorer - Super Spies",{}],"BDOP":["Dora the Explorer - Super Star Adventures!",{}],"BDOE":["Dora the Explorer - Super Star Adventures!",{}],"AERE":["Dora the Explorer - The Search for the Pirate Pig's Treasure",{}],"B2EE":["Dora the Explorer Double Pack",{}],"ADPJ":["Doraemon - Dokodemo Walker",{"eeprom":{"size":"8192"}}],"ADRJ":["Doraemon - Midori no Wakusei Dokidoki Daikyuushutsu!",{"sram":{"size":"32768"}}],"BDDE":["Double Dragon Advance",{}],"BDDJ":["Double Dragon Advance",{}],"BW2P":["Double Game! - Cartoon Network Block Party & Cartoon Network Speedway",{}],"BWCP":["Double Game! - Golden Nugget Casino & Texas Hold 'em Poker",{}],"BWQP":["Double Game! - Quad Desert Fury & Monster Trucks",{}],"BW3J":["Double Pack - Sonic Advance & ChuChu Rocket!",{"flash":{"size":"65536"}}],"BW4J":["Double Pack - Sonic Advance & Sonic Battle",{"flash":{"size":"65536"}}],"BW6J":["Double Pack - Sonic Battle & Sonic Pinball Party",{"flash":{"size":"65536"}}],"A8DJ":["Doubutsu-jima no Chobigurumi",{"flash":{"size":"65536"}}],"BDCJ":["Doubutsu-jima no Chobigurumi 2 - Tama-chan Monogatari",{"eeprom":{"size":"512"}}],"ADWE":["Downforce",{}],"BDTJ":["Downtown Nekketsu Monogatari EX",{"eeprom":{"size":"8192"}}],"BZPJ":["Dr. Mario & Panel de Pon",{"eeprom":{"size":"512"}}],"A6TP":["Dr. Muto",{"eeprom":{"size":"512"}}],"AQTP":["Dr. Seuss' - The Cat in the Hat",{"eeprom":{"size":"512"}}],"AQTE":["Dr. Seuss' - The Cat in the Hat",{"eeprom":{"size":"8192"}}],"BUOE":["Dr. Sudoku",{"eeprom":{"size":"8192"}}],"BUOP":["Dr. Sudoku",{"eeprom":{"size":"8192"}}],"BDVJ":["Dragon Ball - Advance Adventure",{"eeprom":{"size":"512"}}],"BDVK":["Dragon Ball - Advance Adventure",{"eeprom":{"size":"512"}}],"BDVP":["Dragon Ball - Advanced Adventure",{"eeprom":{"size":"512"}}],"BDVE":["Dragon Ball - Advanced Adventure",{"eeprom":{"size":"512"}}],"BT4E":["Dragon Ball GT - Transformation",{"eeprom":{"size":"8192"}}],"AZJJ":["Dragon Ball Z - Bukuu Tougeki",{"eeprom":{"size":"512"}}],"BG3E":["Dragon Ball Z - Buu's Fury",{"eeprom":{"size":"8192"}}],"ADZE":["Dragon Ball Z - Collectible Card Game",{"sram":{"size":"32768"}}],"AZJK":["Dragon Ball Z - Moogongtoogeuk",{"eeprom":{"size":"512"}}],"AZJP":["Dragon Ball Z - Supersonic Warriors",{"eeprom":{"size":"512"}}],"AZJE":["Dragon Ball Z - Supersonic Warriors",{"eeprom":{"size":"512"}}],"BDBE":["Dragon Ball Z - Taiketsu",{"eeprom":{"size":"512"}}],"BDBP":["Dragon Ball Z - Taiketsu",{"eeprom":{"size":"512"}}],"ALGP":["Dragon Ball Z - The Legacy of Goku",{"eeprom":{"size":"512"}}],"ALGE":["Dragon Ball Z - The Legacy of Goku",{"eeprom":{"size":"512"}}],"ALFP":["Dragon Ball Z - The Legacy of Goku II",{"eeprom":{"size":"8192"}}],"ALFE":["Dragon Ball Z - The Legacy of Goku II",{"eeprom":{"size":"8192"}}],"ALFJ":["Dragon Ball Z - The Legacy of Goku II International",{"eeprom":{"size":"8192"}}],"A5GJ":["Dragon Drive - World D Break",{"sram":{"size":"32768"}}],"AT2J":["Dragon Quest Characters - Torneko no Daibouken 2 Advance - Fushigi no Dungeon",{"flash":{"size":"65536"}}],"BD3J":["Dragon Quest Characters - Torneko no Daibouken 3 Advance - Fushigi no Dungeon",{"flash":{"size":"65536"}}],"A9HJ":["Dragon Quest Monsters - Caravan Heart",{"eeprom":{"size":"8192"}}],"BD9E":["Dragon Tales - Dragon Adventures",{}],"BJDP":["Dragon's Rock",{"eeprom":{"size":"512"}}],"AJYE":["Drake & Josh",{}],"V49E":["Drill Dozer",{"sram":{"size":"32768"}}],"B3RE":["Driv3r",{"eeprom":{"size":"512"}}],"B3RP":["Driv3r",{"eeprom":{"size":"512"}}],"ADVP":["Driven",{"eeprom":{"size":"512"}}],"ADVE":["Driven",{"eeprom":{"size":"512"}}],"ADUE":["Driver 2 Advance",{"eeprom":{"size":"512"}}],"ADUP":["Driver 2 Advance",{"eeprom":{"size":"512"}}],"AOEE":["Drome Racers",{"eeprom":{"size":"512"}}],"AOEX":["Drome Racers",{"eeprom":{"size":"512"}}],"AD7P":["Droopy's Tennis Open",{}],"AB9J":["Dual Blades",{"eeprom":{"size":"512"}}],"AB9E":["Dual Blades",{"eeprom":{"size":"512"}}],"AA9J":["Duel Masters",{"sram":{"size":"32768"}}],"BD6E":["Duel Masters - Kaijudo Showdown",{"eeprom":{"size":"512"}}],"BD6P":["Duel Masters - Kaijudo Showdown",{"eeprom":{"size":"512"}}],"AA9E":["Duel Masters - Sempai Legends",{"eeprom":{"size":"512"}}],"AA9P":["Duel Masters - Sempai Legends",{"eeprom":{"size":"512"}}],"BDUP":["Duel Masters - Shadow of the Code",{"eeprom":{"size":"512"}}],"BDUE":["Duel Masters - Shadow of the Code",{"eeprom":{"size":"512"}}],"BD2J":["Duel Masters 2 - Invincible Advance",{"sram":{"size":"32768"}}],"BD5J":["Duel Masters 2 - Kirifuda Shoubu Ver.",{"sram":{"size":"32768"}}],"BDUJ":["Duel Masters 3",{"sram":{"size":"32768"}}],"AD9P":["Duke Nukem Advance",{"eeprom":{"size":"512"}}],"AD9E":["Duke Nukem Advance",{"eeprom":{"size":"512"}}],"AD4P":["Dungeons & Dragons - Eye of the Beholder",{"sram":{"size":"32768"}}],"AD4E":["Dungeons & Dragons - Eye of the Beholder",{"sram":{"size":"32768"}}],"B36E":["Dynasty Warriors Advance",{"sram":{"size":"32768"}}],"B36P":["Dynasty Warriors Advance",{"sram":{"size":"32768"}}],"AETE":["E.T. - The Extra-Terrestrial",{}],"AETP":["E.T. - The Extra-Terrestrial",{}],"AGRP":["ESPN Final Round Golf",{"flash":{"size":"65536"}}],"AGRE":["ESPN Final Round Golf 2002",{"flash":{"size":"65536"}}],"AMGE":["ESPN Great Outdoor Games - Bass 2002",{"sram":{"size":"32768"}}],"AMGP":["ESPN Great Outdoor Games - Bass Tournament",{"eeprom":{"size":"8192"}}],"AWIP":["ESPN International Winter Sports",{"eeprom":{"size":"512"}}],"AWIE":["ESPN International Winter Sports 2002",{"eeprom":{"size":"512"}}],"AWXP":["ESPN Winter X-Games Snowboarding 2",{"eeprom":{"size":"512"}}],"AWXE":["ESPN Winter X-Games Snowboarding 2002",{"eeprom":{"size":"512"}}],"AWXJ":["ESPN Winter X-Games Snowboarding 2002",{"eeprom":{"size":"8192"}}],"AXSE":["ESPN X-Games Skateboarding",{"eeprom":{"size":"512"}}],"AXSP":["ESPN X-Games Skateboarding",{"eeprom":{"size":"512"}}],"AXSJ":["ESPN X-Games Skateboarding",{"eeprom":{"size":"512"}}],"AMOJ":["EX Monopoly",{"sram":{"size":"32768"}}],"A22J":["EZ-Talk - Shokyuu Hen 1",{"sram":{"size":"32768"}}],"A23J":["EZ-Talk - Shokyuu Hen 2",{"sram":{"size":"32768"}}],"A24J":["EZ-Talk - Shokyuu Hen 3",{"sram":{"size":"32768"}}],"A25J":["EZ-Talk - Shokyuu Hen 4",{"sram":{"size":"32768"}}],"A26J":["EZ-Talk - Shokyuu Hen 5",{"sram":{"size":"32768"}}],"A27J":["EZ-Talk - Shokyuu Hen 6",{"sram":{"size":"32768"}}],"AEJE":["Earthworm Jim",{}],"AJ4P":["Earthworm Jim 2",{}],"AJ4E":["Earthworm Jim 2",{}],"AESP":["Ecks vs Sever",{}],"AESE":["Ecks vs Sever",{}],"AEEP":["Ecks vs Sever II - Ballistic",{}],"AE3P":["Ed, Edd n Eddy - Jawbreakers!",{"eeprom":{"size":"512"}}],"AE3E":["Ed, Edd n Eddy - Jawbreakers!",{"eeprom":{"size":"512"}}],"BEDE":["Ed, Edd n Eddy - The Mis-Edventures",{"eeprom":{"size":"512"}}],"BEDP":["Ed, Edd n Eddy - The Mis-Edventures",{"eeprom":{"size":"512"}}],"AEME":["Egg Mania",{}],"AEMJ":["Egg Mania - Tsukande! Mawashite! Dossun Puzzle!!",{}],"AEMP":["Eggo Mania",{}],"AEKJ":["Elemix!",{"eeprom":{"size":"512"}}],"ANWJ":["Elevator Action - Old & New",{"eeprom":{"size":"512"}}],"BELE":["Elf - The Movie",{}],"BELP":["Elf - The Movie",{}],"BEBE":["Elf Bowling 1 & 2",{}],"BZRE":["Enchanted - Once Upon Andalasia",{"eeprom":{"size":"512"}}],"BENP":["Eragon",{"eeprom":{"size":"8192"}}],"BENE":["Eragon",{"eeprom":{"size":"8192"}}],"BEJJ":["Erementar Gerad - Tozasareshi Uta",{"eeprom":{"size":"8192"}}],"AELP":["European Super League",{}],"BEVE":["Ever Girl",{"eeprom":{"size":"512"}}],"AMGJ":["Exciting Bass",{"eeprom":{"size":"8192"}}],"AWTD":["Expedition der Stachelbeeren - Zoff im Zoo",{}],"AEGP":["Extreme Ghostbusters - Code Ecto-1",{}],"AEGE":["Extreme Ghostbusters - Code Ecto-1",{}],"BESX":["Extreme Skate Adventure",{"eeprom":{"size":"512"}}],"BESE":["Extreme Skate Adventure",{"eeprom":{"size":"512"}}],"BE4J":["Eyeshield 21 Devilbats Devildays",{"sram":{"size":"32768"}}],"AFTE":["F-14 Tomcat",{}],"BFTJ":["F-Zero - Climax",{"flash":{"size":"131072"}}],"BFZJ":["F-Zero - Falcon Densetsu",{"sram":{"size":"32768"}}],"BFZP":["F-Zero - GP Legend",{"sram":{"size":"32768"}}],"BFZE":["F-Zero - GP Legend",{"sram":{"size":"32768"}}],"AFZE":["F-Zero - Maximum Velocity",{"sram":{"size":"32768"}}],"AFZJ":["F-Zero for Game Boy Advance",{"sram":{"size":"32768"}}],"AF8X":["F1 2002",{"eeprom":{"size":"512"}}],"AF8E":["F1 2002",{"eeprom":{"size":"512"}}],"BYAE":["F24 Stealth Fighter",{}],"BF6E":["FIFA Soccer 06",{"eeprom":{"size":"512"}}],"B7FE":["FIFA Soccer 07",{"eeprom":{"size":"512"}}],"AFJE":["FIFA Soccer 2003",{"eeprom":{"size":"512"}}],"BFIE":["FIFA Soccer 2004",{"eeprom":{"size":"512"}}],"BF5E":["FIFA Soccer 2005",{"eeprom":{"size":"512"}}],"AFLP":["FILA Decathlon",{"eeprom":{"size":"512"}}],"AF6E":["The Fairly OddParents! - Breakin' da Rules",{}],"BFOE":["The Fairly OddParents! - Clash with the Anti-World",{}],"BFOP":["The Fairly OddParents! - Clash with the Anti-World",{}],"AFVE":["The Fairly OddParents! - Enter the Cleft",{}],"BF2E":["The Fairly OddParents! - Shadow Showdown",{}],"BF2P":["The Fairly OddParents! - Shadow Showdown",{}],"FSMJ":["Famicom Mini 01 - Super Mario Bros.",{"eeprom":{"size":"512"}}],"FDKJ":["Famicom Mini 02 - Donkey Kong",{"eeprom":{"size":"512"}}],"FICJ":["Famicom Mini 03 - Ice Climber",{"eeprom":{"size":"512"}}],"FEBJ":["Famicom Mini 04 - Excitebike",{}],"FZLJ":["Famicom Mini 05 - Zelda no Densetsu 1 - The Hyrule Fantasy",{"eeprom":{"size":"8192"}}],"FPMJ":["Famicom Mini 06 - Pac-Man",{"eeprom":{"size":"512"}}],"FXVJ":["Famicom Mini 07 - Xevious",{"eeprom":{"size":"512"}}],"FMPJ":["Famicom Mini 08 - Mappy",{"eeprom":{"size":"512"}}],"FBMJ":["Famicom Mini 09 - Bomber Man",{"eeprom":{"size":"512"}}],"FSOJ":["Famicom Mini 10 - Star Soldier",{"eeprom":{"size":"512"}}],"FMBJ":["Famicom Mini 11 - Mario Bros.",{"eeprom":{"size":"512"},"isMirrored":true}],"FCLJ":["Famicom Mini 12 - Clu Clu Land",{"eeprom":{"size":"512"},"isMirrored":true}],"FBFJ":["Famicom Mini 13 - Balloon Fight",{"eeprom":{"size":"512"},"isMirrored":true}],"FWCJ":["Famicom Mini 14 - Wrecking Crew",{"eeprom":{"size":"512"},"isMirrored":true}],"FDMJ":["Famicom Mini 15 - Dr. Mario",{"eeprom":{"size":"512"},"isMirrored":true}],"FDDJ":["Famicom Mini 16 - Dig Dug",{"eeprom":{"size":"512"},"isMirrored":true}],"FTBJ":["Famicom Mini 17 - Takahashi Meijin no Bouken-jima",{"eeprom":{"size":"512"},"isMirrored":true}],"FMKJ":["Famicom Mini 18 - Makai Mura",{"eeprom":{"size":"512"},"isMirrored":true}],"FTWJ":["Famicom Mini 19 - Twin Bee",{"eeprom":{"size":"512"},"isMirrored":true}],"FGGJ":["Famicom Mini 20 - Ganbare Goemon! - Karakuri Douchuu",{"eeprom":{"size":"512"},"isMirrored":true}],"FM2J":["Famicom Mini 21 - Super Mario Bros. 2",{"eeprom":{"size":"512"},"isMirrored":true}],"FNMJ":["Famicom Mini 22 - Nazo no Murasame Jou",{"eeprom":{"size":"512"},"isMirrored":true}],"FMRJ":["Famicom Mini 23 - Metroid",{"eeprom":{"size":"8192"},"isMirrored":true}],"FPTJ":["Famicom Mini 24 - Hikari Shinwa - Palthena no Kagami",{"eeprom":{"size":"8192"},"isMirrored":true}],"FLBJ":["Famicom Mini 25 - The Legend of Zelda 2 - Link no Bouken",{"eeprom":{"size":"8192"},"isMirrored":true}],"FFMJ":["Famicom Mini 26 - Famicom Mukashibanashi - Shin Onigashima - Zen, Kouhen",{"eeprom":{"size":"512"},"isMirrored":true}],"FTKJ":["Famicom Mini 27 - Famicom Tantei Club - Kieta Koukeisha - Zen, Kouhen",{"eeprom":{"size":"512"},"isMirrored":true}],"FTUJ":["Famicom Mini 28 - Famicom Tantei Club Part II - Ushiro ni Tatsu Shoujo - Zen, Kouhen",{"eeprom":{"size":"512"},"isMirrored":true}],"FADJ":["Famicom Mini 29 - Akumajou Dracula",{"eeprom":{"size":"512"},"isMirrored":true}],"FSDJ":["Famicom Mini 30 - SD Gundam World - Gachapon Senshi Scramble Wars",{"eeprom":{"size":"8192"},"isMirrored":true}],"AWTF":["La Famille Delajungle - A la Poursuite de Darwin",{}],"AWLF":["La Famille Delajungle - Le Film",{}],"B2FE":["Family Feud",{}],"AATJ":["Family Tennis Advance",{"eeprom":{"size":"512"}}],"AN7J":["Famista Advance",{"eeprom":{"size":"8192"}}],"AJEJ":["Fancy Pocket",{"sram":{"size":"32768"}}],"BF4P":["Fantastic 4",{"eeprom":{"size":"512"}}],"BF4E":["Fantastic 4",{"eeprom":{"size":"512"}}],"BF4X":["Fantastic 4",{"eeprom":{"size":"512"}}],"BH4P":["Fantastic 4 - Flame On",{"eeprom":{"size":"512"}}],"BH4E":["Fantastic 4 - Flame On",{"eeprom":{"size":"512"}}],"BFCJ":["Fantastic Children",{"eeprom":{"size":"8192"}}],"AAXJ":["Fantastic Maerchen - Cake-ya-san Monogatari",{"eeprom":{"size":"8192"}}],"BF4I":["I Fantastici 4",{"eeprom":{"size":"512"}}],"BFUE":["Fear Factor Unleashed",{"eeprom":{"size":"512"}}],"AF9J":["Field of Nine - Digital Edition 2001",{"sram":{"size":"32768"}}],"BOXP":["FightBox",{"eeprom":{"size":"512"}}],"BFFP":["Final Fantasy I & II - Dawn of Souls",{"sram":{"size":"32768"}}],"BFFE":["Final Fantasy I & II - Dawn of Souls",{"sram":{"size":"32768"}}],"BFFJ":["Final Fantasy I, II Advance",{"sram":{"size":"32768"}}],"BZ4E":["Final Fantasy IV Advance",{"sram":{"size":"32768"}}],"BZ4J":["Final Fantasy IV Advance",{"sram":{"size":"32768"}}],"BZ4P":["Final Fantasy IV Advance",{"sram":{"size":"32768"}}],"AFXE":["Final Fantasy Tactics Advance",{"flash":{"size":"65536"}}],"AFXJ":["Final Fantasy Tactics Advance",{"flash":{"size":"65536"}}],"AFXP":["Final Fantasy Tactics Advance",{"flash":{"size":"65536"}}],"BZ5J":["Final Fantasy V Advance",{"sram":{"size":"32768"}}],"BZ5P":["Final Fantasy V Advance",{"sram":{"size":"32768"}}],"BZ5E":["Final Fantasy V Advance",{"sram":{"size":"32768"}}],"BZ6J":["Final Fantasy VI Advance",{"sram":{"size":"32768"}}],"BZ6E":["Final Fantasy VI Advance",{"sram":{"size":"32768"}}],"BZ6P":["Final Fantasy VI Advance",{"sram":{"size":"32768"}}],"AFFE":["Final Fight One",{"eeprom":{"size":"512"}}],"AFFJ":["Final Fight One",{"eeprom":{"size":"512"}}],"AFFP":["Final Fight One",{"eeprom":{"size":"512"}}],"AFWJ":["Final Fire Pro Wrestling - Yume no Dantai Unei!",{"flash":{"size":"65536"}}],"AZID":["Findet Nemo",{}],"AZIX":["Finding Nemo",{}],"AZIY":["Finding Nemo",{}],"BFNJ":["Finding Nemo",{}],"AZIE":["Finding Nemo",{}],"BZIJ":["Finding Nemo - Aratanaru Bouken",{"eeprom":{"size":"512"}}],"BZIE":["Finding Nemo - The Continuing Adventures",{}],"BZIX":["Finding Nemo - The Continuing Adventures",{}],"BZIY":["Finding Nemo - The Continuing Adventures",{}],"AE7E":["Fire Emblem",{"sram":{"size":"32768"}}],"AE7Y":["Fire Emblem",{"sram":{"size":"32768"}}],"AE7X":["Fire Emblem",{"sram":{"size":"32768"}}],"AFEJ":["Fire Emblem - Fuuin no Tsurugi",{"sram":{"size":"32768"}}],"AE7J":["Fire Emblem - Rekka no Ken",{"sram":{"size":"32768"}}],"BE8J":["Fire Emblem - Seima no Kouseki",{"sram":{"size":"32768"}}],"BE8P":["Fire Emblem - The Sacred Stones",{"sram":{"size":"32768"}}],"BE8E":["Fire Emblem - The Sacred Stones",{"sram":{"size":"32768"}}],"AFPE":["Fire Pro Wrestling",{"flash":{"size":"65536"}}],"AFYE":["Fire Pro Wrestling 2",{"flash":{"size":"65536"}}],"AFPJ":["Fire Pro Wrestling A",{"flash":{"size":"65536"}}],"AFSE":["The Flintstones - Big Trouble in Bedrock",{}],"AFSP":["The Flintstones - Big Trouble in Bedrock",{}],"BLHP":["Flushed Away",{}],"BLHE":["Flushed Away",{}],"BF3P":["Ford Racing 3",{}],"BF3E":["Ford Racing 3",{}],"AFMJ":["Formation Soccer 2002",{"sram":{"size":"32768"}}],"AFOE":["Fortress",{}],"BFYE":["Foster's Home for Imaginary Friends",{"eeprom":{"size":"512"}}],"BFYP":["Foster's Home for Imaginary Friends",{"eeprom":{"size":"512"}}],"BFKE":["Franklin the Turtle",{"eeprom":{"size":"512"}}],"BFKP":["Franklin the Turtle",{"eeprom":{"size":"512"}}],"BFLP":["Franklin's Great Adventures",{"eeprom":{"size":"512"}}],"BFLE":["Franklin's Great Adventures",{"eeprom":{"size":"512"}}],"BFSP":["Freekstyle",{}],"BFSE":["Freekstyle",{}],"ARFP":["Freestyle Scooter",{}],"BFJJ":["Frogger - Kodaibunmei no Nazo",{"eeprom":{"size":"8192"}}],"AFBJ":["Frogger - Mahou no Kuni no Daibouken",{"eeprom":{"size":"512"}}],"AFQE":["Frogger Advance - The Great Quest",{}],"AFQP":["Frogger Advance - The Great Quest",{}],"AFRE":["Frogger's Adventures - Temple of the Frog",{"eeprom":{"size":"512"}}],"AFRP":["Frogger's Adventures - Temple of the Frog",{"eeprom":{"size":"512"}}],"AFBP":["Frogger's Adventures 2 - The Lost Wand",{"eeprom":{"size":"512"}}],"AFBE":["Frogger's Adventures 2 - The Lost Wand",{"eeprom":{"size":"512"}}],"BFJE":["Frogger's Journey - The Forgotten Relic",{"eeprom":{"size":"8192"}}],"AUSJ":["From TV Animation One Piece - Mezase! King of Belly",{"sram":{"size":"32768"}}],"AO7J":["From TV Animation One Piece - Nanatsu-jima no Daihihou",{"sram":{"size":"32768"}}],"BCMJ":["Frontier Stories",{"eeprom":{"size":"8192"}}],"BFDJ":["Fruits Mura no Doubutsu-tachi",{"eeprom":{"size":"8192"}}],"AF4J":["Fushigi no Kuni no Alice",{"eeprom":{"size":"512"}}],"AFAJ":["Fushigi no Kuni no Angelique",{"sram":{"size":"32768"}}],"BFPJ":["Futari wa Pretty Cure - Arienaai! Yume no Sono wa Daimeikyuu",{"eeprom":{"size":"512"}}],"BFMJ":["Futari wa Pretty Cure Max Heart - Maji Maji! Fight de IN Janai",{"eeprom":{"size":"8192"}}],"ACAE":["GT Advance - Championship Racing",{}],"AGWE":["GT Advance 2 - Rally Racing",{"eeprom":{"size":"512"}}],"AGWP":["GT Advance 2 - Rally Racing",{"eeprom":{"size":"512"}}],"A2GE":["GT Advance 3 - Pro Concept Racing",{"eeprom":{"size":"512"}}],"A2GP":["GT Advance 3 - Pro Concept Racing",{"eeprom":{"size":"512"}}],"ATCX":["GT Championship",{"eeprom":{"size":"512"}}],"BJAP":["GT Racers",{}],"ABIJ":["Gachasute! Dino Device - Blue",{"flash":{"size":"65536"}}],"AAIJ":["Gachasute! Dino Device - Red",{"flash":{"size":"65536"}}],"A4XJ":["Gachasute! Dino Device 2 - Dragon",{"eeprom":{"size":"512"}}],"A4WJ":["Gachasute! Dino Device 2 - Phoenix",{"eeprom":{"size":"512"}}],"ANYJ":["Gachinko Pro Yakyuu",{"sram":{"size":"32768"}}],"AQ2P":["Gadget Racers",{"sram":{"size":"32768"}}],"AQAE":["Gadget Racers",{"sram":{"size":"32768"}}],"BGHJ":["Gakkou no Kaidan - Hyakuyoubako no Fuuin",{"eeprom":{"size":"8192"}}],"AYSJ":["Gakkou o Tsukurou!! Advance",{"eeprom":{"size":"8192"}}],"BASJ":["Gakuen Alice - Dokidoki Fushigi Taiken",{"sram":{"size":"32768"}}],"BGSJ":["Gakuen Senki Muryou",{"eeprom":{"size":"512"}}],"AGZJ":["Galaxy Angel Game Boy Advance - Moridakusan Tenshi no Full-Course - Okawari Jiyuu",{"eeprom":{"size":"512"}}],"AG8E":["Galidor - Defenders of the Outer Dimension",{"eeprom":{"size":"512"}}],"ATYJ":["Gambler Densetsu Tetsuya - Yomigaeru Densetsu",{"eeprom":{"size":"8192"}}],"AQWE":["Game & Watch Gallery 4",{"sram":{"size":"32768"}}],"AQWP":["Game & Watch Gallery Advance",{"sram":{"size":"32768"}}],"MGUE":["Game Boy Advance Video - All Grown Up! - Volume 1",{}],"MCNF":["Game Boy Advance Video - Cartoon Network Collection - Edition Platinum",{}],"MCPF":["Game Boy Advance Video - Cartoon Network Collection - Edition Premium",{}],"MCSF":["Game Boy Advance Video - Cartoon Network Collection - Edition Speciale",{}],"MCME":["Game Boy Advance Video - Cartoon Network Collection - Limited Edition",{}],"MCNE":["Game Boy Advance Video - Cartoon Network Collection - Platinum Edition",{}],"MCPE":["Game Boy Advance Video - Cartoon Network Collection - Premium Edition",{}],"MCSE":["Game Boy Advance Video - Cartoon Network Collection - Special Edition",{}],"MCTE":["Game Boy Advance Video - Cartoon Network Collection - Volume 1",{}],"MC2E":["Game Boy Advance Video - Cartoon Network Collection - Volume 2",{}],"MKDE":["Game Boy Advance Video - Codename - Kids Next Door - Volume 1",{}],"MDCE":["Game Boy Advance Video - Disney Channel Collection - Volume 1",{}],"MDRE":["Game Boy Advance Video - Dora the Explorer - Volume 1",{}],"MDBE":["Game Boy Advance Video - Dragon Ball GT - Volume 1",{}],"MN3E":["Game Boy Advance Video - Nicktoons - Volume 3",{}],"MNCE":["Game Boy Advance Video - Nicktoons Collection - Volume 1",{}],"MN2E":["Game Boy Advance Video - Nicktoons Collection - Volume 2",{}],"MPAE":["Game Boy Advance Video - Pokemon - Volume 1",{}],"MPBE":["Game Boy Advance Video - Pokemon - Volume 2",{}],"MPCE":["Game Boy Advance Video - Pokemon - Volume 3",{}],"MPDE":["Game Boy Advance Video - Pokemon - Volume 4",{}],"MSHE":["Game Boy Advance Video - Sonic X - Volume 1",{}],"MSSE":["Game Boy Advance Video - SpongeBob SquarePants - Volume 1",{}],"MS2E":["Game Boy Advance Video - SpongeBob SquarePants - Volume 2",{}],"MS3E":["Game Boy Advance Video - SpongeBob SquarePants - Volume 3",{}],"MSBE":["Game Boy Advance Video - Strawberry Shortcake - Volume 1",{}],"MSRE":["Game Boy Advance Video - Super Robot Monkey Team - Hyper Force Go! - Volume 1",{}],"MTMF":["Game Boy Advance Video - Teenage Mutant Ninja Turtles - Le Demenagement",{}],"MTME":["Game Boy Advance Video - Teenage Mutant Ninja Turtles - Things Change",{}],"MJME":["Game Boy Advance Video - The Adventures of Jimmy Neutron Boy Genius - Volume 1",{}],"MFOE":["Game Boy Advance Video - The Fairly OddParents! - Volume 1",{}],"MF2E":["Game Boy Advance Video - The Fairly OddParents! - Volume 2",{}],"MFPE":["Game Boy Advance Video - The Proud Family - Volume 1",{}],"MYGE":["Game Boy Advance Video - Yu-Gi-Oh! - Yugi vs. Joey",{}],"MYGF":["Game Boy Advance Video - Yu-Gi-Oh! - Yugi vs. Joey",{}],"BGWJ":["Game Boy Wars Advance 1+2",{"flash":{"size":"131072"}}],"BG7E":["Games Explosion!",{}],"BG8J":["Ganbare! Dodge Fighters",{"eeprom":{"size":"8192"}}],"BH5I":["La Gang del Bosco",{"eeprom":{"size":"512"}}],"BGOE":["Garfield - The Search for Pooky",{}],"BGOP":["Garfield - The Search for Pooky",{}],"BG9P":["Garfield and His Nine Lives",{"eeprom":{"size":"512"}}],"BG9E":["Garfield and His Nine Lives",{"eeprom":{"size":"512"}}],"AYGE":["Gauntlet - Dark Legacy",{"eeprom":{"size":"512"}}],"BGKJ":["Gegege no Kitarou - Kikiippatsu! Youkai Rettou",{"sram":{"size":"32768"}}],"AGEE":["Gekido Advance - Kintaro's Revenge",{}],"AGEP":["Gekido Advance - Kintaro's Revenge",{}],"ANNJ":["Gekitou Densetsu Noah - Dream Management",{"eeprom":{"size":"8192"}}],"ACBJ":["Gekitou! Car Battler Go!!",{"eeprom":{"size":"8192"}}],"AZSE":["Gem Smashers",{"eeprom":{"size":"512"}}],"BGJJ":["Genseishin Justirisers - Souchaku! Chikyuu no Senshi-tachi",{"flash":{"size":"65536"}}],"BGMJ":["Gensou Maden Saiyuuki - Hangyaku no Toushin-taishi",{"eeprom":{"size":"8192"}}],"AGKJ":["Gensou Suikoden - Card Stories",{}],"BGIJ":["Get Ride! Amdriver - Senkou no Hero Tanjou!",{"flash":{"size":"65536"}}],"BGPJ":["Get Ride! Amdriver Shuggeki! Battle Party",{"sram":{"size":"32768"}}],"BGBJ":["Get! - Boku no Mushi Tsukamaete",{"eeprom":{"size":"8192"}}],"BGFJ":["GetBackers Dakkanya - Jagan Fuuin!",{"sram":{"size":"32768"}}],"AGBJ":["GetBackers Dakkanya - Jigoku no Scaramouche",{"flash":{"size":"65536"}}],"A8GJ":["GetBackers Dakkanya - Metropolis Dakkan Sakusen!",{"flash":{"size":"65536"}}],"BR8E":["Ghost Rider",{"eeprom":{"size":"512"}}],"AGVJ":["Ghost Trap",{"eeprom":{"size":"512"}}],"B3ZE":["Global Star - Sudoku Fever",{"eeprom":{"size":"512"}}],"B3ZP":["Global Star - Sudoku Fever",{"eeprom":{"size":"512"}}],"BG6P":["Glory Days",{}],"AGQP":["Go! Go! Beckham! - Adventure on Soccer Island",{"eeprom":{"size":"512"}}],"AG4E":["Godzilla - Domination!",{}],"AG4P":["Godzilla - Domination!",{}],"AGNJ":["Goemon - New Age Shutsudou!",{"eeprom":{"size":"8192"}}],"AG4J":["Gojira - Kaijuu Dairantou Advance",{}],"BGGE":["Golden Nugget Casino",{}],"AGSE":["Golden Sun",{"flash":{"size":"65536"},"hasRTC":true}],"AGSI":["Golden Sun",{"flash":{"size":"65536"}}],"AGSD":["Golden Sun",{"flash":{"size":"65536"}}],"AGSF":["Golden Sun",{"flash":{"size":"65536"}}],"AGSS":["Golden Sun",{"flash":{"size":"65536"}}],"AGFD":["Golden Sun - Die Vergessene Epoche",{"flash":{"size":"65536"}}],"AGFF":["Golden Sun - L'Age Perdu",{"flash":{"size":"65536"}}],"AGFI":["Golden Sun - L'Era Perduta",{"flash":{"size":"65536"}}],"AGFS":["Golden Sun - La Edad Perdida",{"flash":{"size":"65536"}}],"AGFE":["Golden Sun - The Lost Age",{"flash":{"size":"65536"},"hasRTC":true}],"AGAP":["Gradius Advance",{"eeprom":{"size":"512"}}],"AGAE":["Gradius Galaxies",{"eeprom":{"size":"512"}}],"AGAJ":["Gradius Generation",{"eeprom":{"size":"512"}}],"BGTP":["Grand Theft Auto Advance",{"eeprom":{"size":"512"}}],"BGTE":["Grand Theft Auto Advance",{"eeprom":{"size":"512"}}],"AG9J":["Greatest Nine",{"sram":{"size":"32768"}}],"BUSE":["Green Eggs and Ham by Dr. Seuss",{"eeprom":{"size":"512"}}],"BGQE":["Greg Hastings' Tournament Paintball Max'd",{"eeprom":{"size":"8192"}}],"AGGP":["Gremlins - Stripe vs Gizmo",{}],"AGGE":["Gremlins - Stripe vs Gizmo",{}],"BIEE":["The Grim Adventures of Billy & Mandy",{"eeprom":{"size":"512"}}],"ARVJ":["Groove Adventure Rave - Hikari to Yami no Daikessen",{"sram":{"size":"32768"}}],"ARIJ":["Groove Adventure Rave - Hikari to Yami no Daikessen 2",{"sram":{"size":"32768"}}],"AGXE":["Guilty Gear X - Advance Edition",{"flash":{"size":"65536"}}],"AGXJ":["Guilty Gear X - Advance Edition",{"flash":{"size":"65536"}}],"AGXP":["Guilty Gear X - Advance Edition",{"flash":{"size":"65536"}}],"BGVE":["Gumby vs. the Astrobots",{"eeprom":{"size":"512"}}],"BHGP":["Gunstar Future Heroes",{"eeprom":{"size":"8192"}}],"BHGE":["Gunstar Super Heroes",{"eeprom":{"size":"8192"}}],"BGXJ":["Gunstar Super Heroes",{"eeprom":{"size":"8192"}}],"AIBJ":["Guranbo",{"sram":{"size":"32768"}}],"AGCJ":["Guru Logic Champ",{"flash":{"size":"65536"}}],"ASBJ":["Gyakuten Saiban",{"sram":{"size":"32768"}}],"A3GJ":["Gyakuten Saiban 2",{"sram":{"size":"32768"}}],"A3JJ":["Gyakuten Saiban 3",{"sram":{"size":"32768"}}],"A8EJ":["Hachiemon",{"eeprom":{"size":"512"}}],"BHRJ":["Hagane no Renkinjutsushi - Meisou no Rondo",{"eeprom":{"size":"512"}}],"BH2J":["Hagane no Renkinjutsushi - Omoide no Sonata",{"eeprom":{"size":"512"}}],"A2HJ":["Hajime no Ippo - The Fighting!",{"eeprom":{"size":"8192"}}],"AM7J":["Hamepane - Tokyo Mew Mew",{"sram":{"size":"32768"}}],"AJHJ":["Hamster Club 3",{"sram":{"size":"32768"}}],"A4KJ":["Hamster Club 4 - Shigetchi Daidassou",{"sram":{"size":"32768"}}],"AHBJ":["Hamster Monogatari 2 GBA",{"sram":{"size":"32768"}}],"A83J":["Hamster Monogatari 3 GBA",{"eeprom":{"size":"8192"}}],"BHSJ":["Hamster Monogatari 3EX 4 Special",{"eeprom":{"size":"512"}}],"BHCJ":["Hamster Monogatari Collection",{"eeprom":{"size":"8192"}}],"A82J":["Hamster Paradise - Pure Heart",{"eeprom":{"size":"8192"}}],"AHAJ":["Hamster Paradise Advanchu",{"eeprom":{"size":"8192"}}],"B85A":["Hamtaro - Ham-Ham Games",{"sram":{"size":"32768"}}],"B85P":["Hamtaro - Ham-Ham Games",{"sram":{"size":"32768"}}],"AH3E":["Hamtaro - Ham-Ham Heartbreak",{"sram":{"size":"32768"}}],"AH3P":["Hamtaro - Ham-Ham Heartbreak",{"sram":{"size":"32768"}}],"A84P":["Hamtaro - Rainbow Rescue",{"sram":{"size":"32768"}}],"BHAJ":["Hanabi Hyakkei Advance",{"flash":{"size":"65536"}}],"ADYJ":["Hanafuda Trump Mahjong - Depachika Wayouchuu",{"eeprom":{"size":"512"}}],"BH3P":["Happy Feet",{"eeprom":{"size":"512"}}],"BH3E":["Happy Feet",{"eeprom":{"size":"512"}}],"AH6E":["Hardcore Pinball",{"eeprom":{"size":"512"}}],"BHOP":["Hardcore Pool",{}],"BHNP":["Harlem Globetrotters - World Tour",{}],"BHNE":["Harlem Globetrotters - World Tour",{}],"AHQJ":["Harobots - Robo Hero Battling!!",{"sram":{"size":"32768"}}],"BHPJ":["Harry Potter - Quidditch World Cup",{"eeprom":{"size":"512"}}],"BHPE":["Harry Potter - Quidditch World Cup",{"eeprom":{"size":"512"}}],"BJPP":["Harry Potter Collection",{"eeprom":{"size":"8192"}}],"A7HE":["Harry Potter and the Chamber of Secrets",{"eeprom":{"size":"512"}}],"BH8E":["Harry Potter and the Goblet of Fire",{"eeprom":{"size":"512"}}],"BJXE":["Harry Potter and the Order of the Phoenix",{"eeprom":{"size":"512"}}],"BHTE":["Harry Potter and the Prisoner of Azkaban",{"eeprom":{"size":"8192"}}],"AHRE":["Harry Potter and the Sorcerer's Stone",{"eeprom":{"size":"512"}}],"BHTJ":["Harry Potter to Azkaban no Shuujin",{"eeprom":{"size":"8192"}}],"A7HJ":["Harry Potter to Himitsu no Heya",{"eeprom":{"size":"512"}}],"AHRJ":["Harry Potter to Kenja no Ishi",{"eeprom":{"size":"512"}}],"A4NP":["Harvest Moon - Friends of Mineral Town",{"sram":{"size":"32768"}}],"A4ND":["Harvest Moon - Friends of Mineral Town",{"sram":{"size":"32768"}}],"A4NE":["Harvest Moon - Friends of Mineral Town",{"sram":{"size":"32768"}}],"BFGE":["Harvest Moon - More Friends of Mineral Town",{"sram":{"size":"32768"}}],"AHSJ":["Hatena Satena",{"sram":{"size":"32768"}}],"BHJP":["Heidi - The Game",{"eeprom":{"size":"512"}}],"B86X":["Hello Kitty - Happy Party Pals",{}],"B86P":["Hello Kitty - Happy Party Pals",{}],"B86E":["Hello Kitty - Happy Party Pals",{}],"AKTJ":["Hello Kitty Collection - Miracle Fashion Maker",{"eeprom":{"size":"8192"}}],"BHDJ":["Hello! Idol Debut - Kids Idol Ikusei Game",{"eeprom":{"size":"8192"}}],"B8FP":["Herbie - Fully Loaded",{"eeprom":{"size":"512"}}],"B8FE":["Herbie - Fully Loaded",{"eeprom":{"size":"512"}}],"AAEE":["Hey Arnold! - The Movie",{}],"AAEP":["Hey Arnold! - The Movie",{}],"BHHJ":["Hi Hi Puffy AmiYumi",{"eeprom":{"size":"512"}}],"BHHE":["Hi Hi Puffy AmiYumi - Kaznapped!",{"eeprom":{"size":"512"}}],"BHHP":["Hi Hi Puffy AmiYumi - Kaznapped!",{"eeprom":{"size":"512"}}],"AHZJ":["Higanbana",{"eeprom":{"size":"8192"}}],"ASSE":["High Heat Major League Baseball 2002",{"eeprom":{"size":"512"}}],"AHHE":["High Heat Major League Baseball 2003",{"eeprom":{"size":"8192"}}],"AHXJ":["High Heat Major League Baseball 2003",{"eeprom":{"size":"8192"}}],"BJ2E":["High School Musical - Livin' the Dream",{"eeprom":{"size":"512"}}],"AHKJ":["Hikaru no Go",{"sram":{"size":"32768"}}],"AKEJ":["Hikaru no Go 2",{"sram":{"size":"32768"}}],"BNBJ":["Himawari Doubutsu Byouin - Pet no Oishasan Ikusei Game",{"eeprom":{"size":"8192"}}],"A3HJ":["Hime Kishi Monogatari - Princess Blue",{"sram":{"size":"32768"}}],"AHIJ":["Hitsuji no Kimochi.",{"eeprom":{"size":"8192"}}],"AH9J":["Hobbit no Bouken - Lord of the Rings - Hajimari no Monogatari",{"eeprom":{"size":"512"}}],"AH9E":["The Hobbit",{"eeprom":{"size":"512"}}],"AH9P":["The Hobbit",{"eeprom":{"size":"512"}}],"BHME":["Home on the Range",{}],"BHMP":["Home on the Range",{}],"BHUE":["Horsez",{"eeprom":{"size":"8192"}}],"B8KJ":["Hoshi no Kirby - Kagami no Daimeikyuu",{"sram":{"size":"32768"}}],"A7KJ":["Hoshi no Kirby - Yume no Izumi Deluxe",{"sram":{"size":"32768"}}],"AHPP":["Hot Potato!",{"eeprom":{"size":"512"}}],"AHPX":["Hot Potato!",{"eeprom":{"size":"512"}}],"AHPE":["Hot Potato!",{"eeprom":{"size":"512"}}],"BHXE":["Hot Wheels - All Out",{}],"BHXP":["Hot Wheels - All Out",{}],"AHWP":["Hot Wheels - Burnin' Rubber",{"eeprom":{"size":"512"}}],"AHWE":["Hot Wheels - Burnin' Rubber",{"eeprom":{"size":"512"}}],"BHEE":["Hot Wheels - Stunt Track Challenge",{}],"AH8P":["Hot Wheels - Velocity X",{}],"AH8E":["Hot Wheels - Velocity X",{}],"BHWE":["Hot Wheels - World Race",{}],"BHWP":["Hot Wheels - World Race",{}],"AHWJ":["Hot Wheels Advance",{"eeprom":{"size":"512"}}],"B7IJ":["Hudson Best Collection Vol. 1 - Bomber Man Collection",{}],"B72J":["Hudson Best Collection Vol. 2 - Lode Runner Collection",{}],"B73J":["Hudson Best Collection Vol. 3 - Action Collection",{}],"B74J":["Hudson Best Collection Vol. 4 - Nazotoki Collection",{}],"B75J":["Hudson Best Collection Vol. 5 - Shooting Collection",{}],"B76J":["Hudson Best Collection Vol. 6 - Bouken-jima Collection",{}],"AZHP":["Hugo - Bukkazoom!",{}],"AHJP":["Hugo - The Evil Mirror Advance",{"eeprom":{"size":"512"}}],"AHJE":["Hugo - The Evil Mirror Advance",{"eeprom":{"size":"512"}}],"B2HP":["Hugo 2 in 1",{"eeprom":{"size":"512"}}],"A8NJ":["Hunter X Hunter - Minna Tomodachi Daisakusen!!",{"sram":{"size":"32768"}}],"AWIJ":["Hyper Sports 2002 Winter",{"eeprom":{"size":"8192"}}],"A4CE":["I Spy Challenger!",{"eeprom":{"size":"512"}}],"AIAJ":["Ice Age",{}],"AIAE":["Ice Age",{}],"AIAP":["Ice Age",{}],"BIAP":["Ice Age 2 - The Meltdown",{"eeprom":{"size":"512"}}],"BIAE":["Ice Age 2 - The Meltdown",{"eeprom":{"size":"512"}}],"AR3E":["Ice Nine",{"eeprom":{"size":"512"}}],"BIVP":["Ignition Collection - Volume 1",{}],"BICI":["Incredibili, Gli - Una 'Normale' Famiglia di Supereroi",{}],"AHLP":["The Incredible Hulk",{"eeprom":{"size":"512"}}],"AHLE":["The Incredible Hulk",{"eeprom":{"size":"512"}}],"BICX":["The Incredibles",{}],"BICE":["The Incredibles",{}],"BIQE":["The Incredibles - Rise of the Underminer",{}],"BIQX":["The Incredibles - Rise of the Underminer",{}],"BICS":["Increibles, Los",{}],"AINJ":["Initial D - Another Stage",{"sram":{"size":"32768"}}],"AIGE":["Inspector Gadget - Advance Mission",{}],"AIGP":["Inspector Gadget - Advance Mission",{}],"AIRP":["Inspector Gadget Racing",{}],"AIKP":["International Karate Advanced",{}],"A3KE":["International Karate Plus",{}],"A3KP":["International Karate Plus",{}],"AISP":["International Superstar Soccer",{"eeprom":{"size":"8192"}}],"AY2P":["International Superstar Soccer Advance",{"eeprom":{"size":"8192"}}],"AI9J":["Inukko Club",{"sram":{"size":"32768"}}],"AIYJ":["Inuyasha - Naraku no Wana! Mayoi no Mori no Shoutaijou",{"sram":{"size":"32768"}}],"AIVP":["Invader",{}],"AIOE":["The Invincible Iron Man",{"eeprom":{"size":"512"}}],"AI3E":["Iridion 3D",{}],"AI2E":["Iridion II",{}],"AI2P":["Iridion II",{}],"BIRK":["Iron Kid",{"eeprom":{"size":"512"}}],"AIEJ":["Isseki Hatchou - Kore 1ppon de 8shurui!",{"sram":{"size":"32768"}}],"BPIE":["It's Mr. Pants",{"eeprom":{"size":"8192"}}],"AJPJ":["J.League Pocket",{"sram":{"size":"32768"}}],"AJ2J":["J.League Pocket 2",{"sram":{"size":"32768"}}],"AC2J":["J.League Pro Soccer Club o Tsukurou! Advance",{"sram":{"size":"32768"}}],"A2JJ":["J.League Winning Eleven Advance 2002",{"eeprom":{"size":"8192"}}],"AGRJ":["JGTO Kounin Golf Master - Japan Golf Tour Game",{"flash":{"size":"65536"}}],"AGMJ":["JGTO Kounin Golf Master Mobile - Japan Golf Tour Game",{"flash":{"size":"65536"}}],"AJCE":["Jackie Chan Adventures - Legend of the Darkhand",{"eeprom":{"size":"512"}}],"BNJJ":["Jajamaru Jr. Denshouki - Jalecolle mo Arisourou",{"eeprom":{"size":"512"}}],"AJDE":["James Pond - Codename Robocod",{}],"AJDP":["James Pond - Codename Robocod",{}],"AJJE":["Jazz Jackrabbit",{"eeprom":{"size":"512"}}],"AJRE":["Jet Grind Radio",{"eeprom":{"size":"512"}}],"AJRP":["Jet Set Radio",{"eeprom":{"size":"512"}}],"AJWJ":["Jikkyou World Soccer Pocket",{"eeprom":{"size":"8192"}}],"AJKJ":["Jikkyou World Soccer Pocket 2",{"eeprom":{"size":"8192"}}],"AJNE":["Jimmy Neutron Boy Genius",{}],"AJNX":["Jimmy Neutron Boy Genius",{}],"BJYF":["Jimmy Neutron un Garcon Genial - L'Attaque des Twonkies",{"eeprom":{"size":"512"}}],"AZGJ":["Jinsei Game Advance",{"sram":{"size":"32768"}}],"AJUJ":["Jissen Pachi-Slot Hisshouhou! - Juuou Advance",{"flash":{"size":"65536"}}],"AFZC":["Jisu F-Zero Weilai Saiche",{"sram":{"size":"32768"}}],"AJME":["Jonny Moseley Mad Trix",{"eeprom":{"size":"512"}}],"BJKE":["Juka and the Monophonic Menace",{"eeprom":{"size":"512"}}],"BJKP":["Juka and the Monophonic Menace",{"eeprom":{"size":"512"}}],"AJFP":["The Jungle Book 2",{}],"AJFE":["The Jungle Book",{}],"AJQJ":["Jurassic Park III - Advanced Action",{"eeprom":{"size":"512"}}],"AJQP":["Jurassic Park III - Dino Attack",{"eeprom":{"size":"512"}}],"AJQE":["Jurassic Park III - Island Attack",{"eeprom":{"size":"512"}}],"AJ3J":["Jurassic Park III - Kyouryuu ni Ainiikou!",{"sram":{"size":"32768"}}],"AJ3E":["Jurassic Park III - Park Builder",{"sram":{"size":"32768"}}],"AJ3P":["Jurassic Park III - Park Builder",{"sram":{"size":"32768"}}],"ADNP":["Jurassic Park III - The DNA Factor",{"eeprom":{"size":"512"}}],"ADNE":["Jurassic Park III - The DNA Factor",{"eeprom":{"size":"512"}}],"ADNJ":["Jurassic Park III - Ushinawareta Idenshi",{"eeprom":{"size":"512"}}],"AJ8J":["Jurassic Park Institute Tour - Dinosaur Rescue",{"eeprom":{"size":"512"}}],"AJLE":["Justice League - Injustice for All",{"eeprom":{"size":"512"}}],"AJLP":["Justice League - Injustice for All",{"eeprom":{"size":"512"}}],"BJLE":["Justice League Chronicles",{"eeprom":{"size":"512"}}],"BJHP":["Justice League Heroes - The Flash",{"eeprom":{"size":"512"}}],"BJHE":["Justice League Heroes - The Flash",{"eeprom":{"size":"512"}}],"AKVJ":["K-1 Pocket Grand Prix",{"eeprom":{"size":"8192"}}],"A2OJ":["K-1 Pocket Grand Prix 2",{"eeprom":{"size":"8192"}}],"AKDJ":["Kaeru B Back",{"sram":{"size":"32768"}}],"BKOJ":["Kaiketsu Zorori to Mahou no Yuuenchi - Ohimesama o Sukue!",{"eeprom":{"size":"8192"}}],"AKZJ":["Kamaitachi no Yoru Advance",{"flash":{"size":"65536"}}],"AG2J":["Kami no Kijutsu - Illusion of the Evil Eyes",{"sram":{"size":"32768"}}],"AKKE":["Kao the Kangaroo",{}],"AKKP":["Kao the Kangaroo",{}],"BK8J":["Kappa no Kai-kata - Kaatan Daibouken!",{"sram":{"size":"32768"}}],"AYKE":["Karnaaj Rally",{}],"BN4J":["Kawa no Nushi Tsuri 3 & 4",{"sram":{"size":"32768"}}],"AN5J":["Kawa no Nushi Tsuri 5 - Fushigi no Mori kara",{"eeprom":{"size":"8192"}}],"B82J":["Kawaii Koinu Wonderful",{"eeprom":{"size":"512"}}],"BKGJ":["Kawaii Pet Game Gallery",{}],"BKPJ":["Kawaii Pet Game Gallery 2",{"eeprom":{"size":"512"}}],"A63J":["Kawaii Pet Shop Monogatari 3",{"eeprom":{"size":"8192"}}],"AKLJ":["Kaze no Klonoa - Yumemiru Teikoku",{"eeprom":{"size":"512"}}],"AN6J":["Kaze no Klonoa G2 - Dream Champ Tournament",{"eeprom":{"size":"512"}}],"ATPJ":["Keitai Denjuu Telefang 2 - Power",{"flash":{"size":"65536"}}],"ATSJ":["Keitai Denjuu Telefang 2 - Speed",{"flash":{"size":"65536"}}],"AS3E":["Kelly Slater's Pro Surfer",{"eeprom":{"size":"512"}}],"BKJJ":["Keroro Gunsou - Taiketsu! Gekisou Keronprix Daisakusen de Arimasu!!",{"sram":{"size":"32768"}}],"BG2J":["Kessaku Sen! - Ganbare Goemon 1, 2 - Yuki Hime to Magginesu",{"eeprom":{"size":"512"}}],"BYLP":["Kid Paddle",{"eeprom":{"size":"512"}}],"BCXE":["Kid's Cards",{}],"BH6J":["Kidou Gekidan Haro Ichiza Haro no Puyo Puyo",{"eeprom":{"size":"512"}}],"BGNJ":["Kidou Senshi Gundam Seed - Tomo to Kimi to Koko de.",{"eeprom":{"size":"8192"}}],"B42J":["Kidou Senshi Gundam Seed Destiny",{"eeprom":{"size":"512"}}],"AALJ":["Kidou Tenshi Angelic Layer - Misaki to Yume no Tenshi-tachi",{"eeprom":{"size":"8192"}}],"AKGJ":["Kikaika Guntai - Mech Platoon",{"eeprom":{"size":"8192"}}],"AKIJ":["Kikikai-kai Advance",{}],"BKHP":["Kill Switch",{"eeprom":{"size":"512"}}],"BKHE":["Kill Switch",{"eeprom":{"size":"512"}}],"B3LE":["Killer 3D Pool",{}],"B3LP":["Killer 3D Pool",{}],"BKMJ":["Kim Possible",{"eeprom":{"size":"512"}}],"AEYP":["Kim Possible",{}],"AEYE":["Kim Possible - Revenge of Monkey Fist",{}],"BKME":["Kim Possible 2 - Drakken's Demise",{"eeprom":{"size":"512"}}],"BKMP":["Kim Possible 2 - Drakken's Demise",{"eeprom":{"size":"512"}}],"BQPE":["Kim Possible III - Team Possible",{"eeprom":{"size":"512"}}],"BKQP":["King Kong - The Official Game of the Movie",{"eeprom":{"size":"512"}}],"AKOE":["The King of Fighters EX - NeoBlood",{"eeprom":{"size":"512"}}],"AKOJ":["The King of Fighters EX - NeoBlood",{"eeprom":{"size":"512"}}],"AKOP":["The King of Fighters EX - NeoBlood",{"eeprom":{"size":"512"}}],"AEXE":["The King of Fighters EX2 - Howling Blood",{"eeprom":{"size":"512"}}],"AEXJ":["The King of Fighters EX2 - Howling Blood",{"eeprom":{"size":"512"}}],"B8CP":["Kingdom Hearts - Chain of Memories",{"sram":{"size":"32768"}}],"B8CE":["Kingdom Hearts - Chain of Memories",{"sram":{"size":"32768"}}],"B8CJ":["Kingdom Hearts - Chain of Memories",{"sram":{"size":"32768"}}],"AK5J":["Kinniku Banzuke - Kimero! Kiseki no Kanzen Seiha",{"sram":{"size":"32768"}}],"AK4J":["Kinniku Banzuke - Kongou-kun no Daibouken!",{"sram":{"size":"32768"}}],"AK2J":["Kinnikuman II-Sei - Seigi Choujin e no Michi",{"eeprom":{"size":"512"}}],"B8KE":["Kirby & the Amazing Mirror",{"sram":{"size":"32768"}}],"B8KP":["Kirby & the Amazing Mirror",{"sram":{"size":"32768"}}],"A7KE":["Kirby - Nightmare in Dream Land",{"sram":{"size":"32768"}}],"A7KP":["Kirby - Nightmare in Dream Land",{"sram":{"size":"32768"}}],"A2VJ":["Kisekko Gurumii - Chesty to Nuigurumi-tachi no Mahou no Bouken",{"eeprom":{"size":"8192"}}],"B2KJ":["Kiss x Kiss Seirei Gakuen",{"eeprom":{"size":"8192"}}],"AKMJ":["Kiwame Mahjong Deluxe - Mirai Senshi 21",{"sram":{"size":"32768"}}],"AKLE":["Klonoa - Empire of Dreams",{"eeprom":{"size":"512"}}],"AKLP":["Klonoa - Empire of Dreams",{"eeprom":{"size":"512"}}],"AN6E":["Klonoa 2 - Dream Champ Tournament",{"eeprom":{"size":"512"}}],"AK7J":["Klonoa Heroes - Densetsu no Star Medal",{"eeprom":{"size":"8192"}}],"BKNE":["Knights' Kingdom",{}],"BKNP":["Knights' Kingdom",{}],"BAKE":["Koala Brothers - Outback Adventures",{}],"BAKP":["Koala Brothers - Outback Adventures",{}],"BDIJ":["Koinu to Issho - Aijou Monogatari",{"eeprom":{"size":"512"}}],"BI2J":["Koinu to Issho 2",{"eeprom":{"size":"512"}}],"BISJ":["Koinu-chan no Hajimete no Osanpo - Koinu no Kokoro Ikusei Game",{"eeprom":{"size":"8192"}}],"AKCJ":["Konami Arcade Game Collection",{}],"AKCE":["Konami Collector's Series - Arcade Advanced",{}],"AKCP":["Konami Collector's Series - Arcade Classics",{}],"AKWP":["Konami Krazy Racers",{"sram":{"size":"32768"}}],"AKWE":["Konami Krazy Racers",{"sram":{"size":"32768"}}],"AKWJ":["Konami Wai Wai Racing Advance",{"sram":{"size":"32768"}}],"BQBJ":["Konchuu Monster Battle Master",{"eeprom":{"size":"8192"}}],"BQSJ":["Konchuu Monster Battle Stadium",{"eeprom":{"size":"8192"}}],"BQKJ":["Konchuu no Mori no Daibouken - Fushigi na Sekai no Juunin-tachi",{"eeprom":{"size":"512"}}],"BK7P":["Kong - King of Atlantis",{}],"BK7E":["Kong - King of Atlantis",{}],"BKQE":["Kong - The 8th Wonder of the World",{"eeprom":{"size":"512"}}],"AKQP":["Kong - The Animated Series",{}],"AKQE":["Kong - The Animated Series",{}],"BKBJ":["Konjiki no Gashbell!! - Makai no Bookmark",{"sram":{"size":"32768"}}],"A4GJ":["Konjiki no Gashbell!! - Unare! Yuujou no Zakeru",{"eeprom":{"size":"8192"}}],"BGYJ":["Konjiki no Gashbell!! - Unare! Yuujou no Zakeru 2",{"eeprom":{"size":"512"}}],"BKEJ":["Konjiki no Gashbell!! The Card Battle for GBA",{"eeprom":{"size":"8192"}}],"BUDJ":["Konjiki no Gashbell!! Yuujou no Zakeru - Dream Tag Tournament",{"eeprom":{"size":"512"}}],"KHPJ":["Koro Koro Puzzle - Happy Panechu!",{"eeprom":{"size":"512"},"hasMotionSensor":true}],"A8MJ":["Kotoba no Puzzle - Mojipittan Advance",{"sram":{"size":"32768"}}],"BK6J":["Kouchu Ouja Mushiking",{"sram":{"size":"32768"}}],"A54J":["Koukou Juken Advance Series Eigo Koubun Hen - 26 Units Shuuroku",{"sram":{"size":"32768"}}],"A53J":["Koukou Juken Advance Series Eijukugo Hen - 650 Phrases Shuuroku",{"sram":{"size":"32768"}}],"A52J":["Koukou Juken Advance Series Eitango Hen - 2000 Words Shuuroku",{"sram":{"size":"32768"}}],"BKTJ":["Koutetsu Teikoku from HOT-B",{"eeprom":{"size":"512"}}],"B9AJ":["Kunio Kun Nekketsu Collection 1",{}],"B9BJ":["Kunio Kun Nekketsu Collection 2",{}],"B9CJ":["Kunio Kun Nekketsu Collection 3",{}],"AGOJ":["Kurohige no Golf Shiyouyo",{"sram":{"size":"32768"}}],"AKUJ":["Kurohige no Kurutto Jintori",{"sram":{"size":"32768"}}],"AKRJ":["Kurukuru Kururin",{"sram":{"size":"32768"}}],"AKRP":["Kurukuru Kururin",{"sram":{"size":"32768"}}],"A9QJ":["Kururin Paradise",{"sram":{"size":"32768"}}],"ALBE":["LEGO Bionicle",{"sram":{"size":"32768"}}],"ALBP":["LEGO Bionicle",{"sram":{"size":"32768"}}],"AXTE":["LEGO Island - Xtreme Stunts",{"eeprom":{"size":"512"}}],"AL2P":["LEGO Island 2 - The Brickster's Revenge",{"sram":{"size":"32768"}}],"AL2E":["LEGO Island 2 - The Brickster's Revenge",{"sram":{"size":"32768"}}],"ALRP":["LEGO Racers 2",{"eeprom":{"size":"512"}}],"ALRE":["LEGO Racers 2",{"eeprom":{"size":"512"}}],"ALSE":["LEGO Soccer Mania",{"eeprom":{"size":"512"}}],"BLWJ":["LEGO Star Wars - The Video Game",{"eeprom":{"size":"512"}}],"BLWE":["LEGO Star Wars - The Video Game",{"eeprom":{"size":"512"}}],"BL7P":["LEGO Star Wars II - The Original Trilogy",{"eeprom":{"size":"512"}}],"BL7E":["LEGO Star Wars II - The Original Trilogy",{"eeprom":{"size":"512"}}],"ALDE":["Lady Sia",{"eeprom":{"size":"512"}}],"ALDP":["Lady Sia",{"eeprom":{"size":"512"}}],"ALAP":["The Land Before Time",{}],"ALAE":["The Land Before Time",{}],"BLOE":["The Land Before Time - Into the Mysterious Beyond",{"eeprom":{"size":"512"}}],"BLOP":["The Land Before Time - Into the Mysterious Beyond",{"eeprom":{"size":"512"}}],"BL8P":["Lara Croft Tomb Raider - Legend",{"eeprom":{"size":"512"}}],"BL8E":["Lara Croft Tomb Raider - Legend",{"eeprom":{"size":"512"}}],"AUTJ":["Lara Croft Tomb Raider - The Prophecy",{}],"AL9P":["Lara Croft Tomb Raider - The Prophecy",{}],"AL9E":["Lara Croft Tomb Raider - The Prophecy",{}],"BQTF":["Lea - Passion Veterinaire",{"eeprom":{"size":"8192"}}],"AVDJ":["Legend of Dynamic Goushouden - Houkai no Rondo",{"sram":{"size":"32768"}}],"B3YP":["The Legend of Spyro - A New Beginning",{"eeprom":{"size":"8192"}}],"B3YE":["The Legend of Spyro - A New Beginning",{"eeprom":{"size":"8192"}}],"BU7P":["The Legend of Spyro - The Eternal Night",{"eeprom":{"size":"512"}}],"BU7E":["The Legend of Spyro - The Eternal Night",{"eeprom":{"size":"512"}}],"AZLE":["The Legend of Zelda - A Link to the Past & Four Swords",{"eeprom":{"size":"8192"}}],"AZLP":["The Legend of Zelda - A Link to the Past & Four Swords",{"eeprom":{"size":"8192"}}],"BZME":["The Legend of Zelda - The Minish Cap",{"eeprom":{"size":"8192"}}],"BZMP":["The Legend of Zelda - The Minish Cap",{"eeprom":{"size":"8192"}}],"A2LE":["Legends of Wrestling II",{"eeprom":{"size":"512"}}],"BLJK":["Legendz - Buhwarhaneun Siryeonyi Seom",{"flash":{"size":"65536"}}],"BLVJ":["Legendz - Sign of Nekuromu",{"flash":{"size":"65536"}}],"BLJJ":["Legendz - Yomigaeru Shiren no Shima",{"flash":{"size":"65536"}}],"BLYD":["Lemony Snicket - Raetselhafte Ereignisse",{"eeprom":{"size":"512"}}],"BLYI":["Lemony Snicket - Una Serie di Sfortunati Eventi",{"eeprom":{"size":"512"}}],"BLYE":["Lemony Snicket's A Series of Unfortunate Events",{"eeprom":{"size":"512"}}],"BLYX":["Lemony Snicket's A Series of Unfortunate Events",{"eeprom":{"size":"512"}}],"BL9E":["Let's Ride! - Dreamer",{"eeprom":{"size":"8192"}}],"BEFE":["Let's Ride! - Friends Forever",{"eeprom":{"size":"8192"}}],"B34E":["Let's Ride! - Sunshine Stables",{"eeprom":{"size":"8192"}}],"BRNJ":["Licca-chan no Oshare Nikki",{"sram":{"size":"32768"}}],"BRPJ":["Lilliput Oukoku - Lillimoni to Issho Puni!",{"eeprom":{"size":"8192"}}],"ALTE":["Lilo & Stitch",{}],"BLSJ":["Lilo & Stitch",{"eeprom":{"size":"512"}}],"ALTP":["Lilo & Stitch",{}],"BLSP":["Lilo & Stitch 2",{"eeprom":{"size":"512"}}],"BLSE":["Lilo & Stitch 2 - Haemsterviel Havoc",{"eeprom":{"size":"512"}}],"BLKE":["The Lion King 1 1-2",{"eeprom":{"size":"512"}}],"BLKP":["The Lion King",{"eeprom":{"size":"512"}}],"ALQJ":["Little Buster Q",{"sram":{"size":"32768"}}],"BEIE":["Little Einsteins",{}],"ALCE":["Little League Baseball 2002",{}],"BN9E":["The Little Mermaid - Magic in Two Kingdoms",{"eeprom":{"size":"512"}}],"BLIJ":["Little Patissier - Cake no Oshiro",{"eeprom":{"size":"8192"}}],"BLMP":["Lizzie McGuire",{"eeprom":{"size":"8192"}}],"BLME":["Lizzie McGuire - On the Go!",{"eeprom":{"size":"8192"}}],"BL2E":["Lizzie McGuire 2 - Lizzie Diaries",{"eeprom":{"size":"512"}}],"BL3E":["Lizzie McGuire 3 - Homecoming Havoc",{"eeprom":{"size":"512"}}],"A39J":["Lode Runner",{"eeprom":{"size":"512"}}],"BLTE":["Looney Tunes - Back in Action",{"eeprom":{"size":"512"}}],"BLNE":["Looney Tunes Double Pack",{"eeprom":{"size":"512"}}],"BLNP":["Looney Tunes Double Pack",{"eeprom":{"size":"512"}}],"ALPJ":["The Lord of the Rings - Futatsu no Tou",{"eeprom":{"size":"512"}}],"B3AJ":["The Lord of the Rings - Nakatsukuni Daisanki",{"eeprom":{"size":"512"}}],"BLRJ":["The Lord of the Rings - Ou no Kikan",{"eeprom":{"size":"512"}}],"ALOE":["The Lord of the Rings - The Fellowship of the Ring",{"eeprom":{"size":"8192"}}],"ALOP":["The Lord of the Rings - The Fellowship of the Ring",{"eeprom":{"size":"8192"}}],"BLRE":["The Lord of the Rings - The Return of the King",{"eeprom":{"size":"512"}}],"B3AE":["The Lord of the Rings - The Third Age",{"eeprom":{"size":"8192"}}],"ALPE":["The Lord of the Rings - The Two Towers",{"eeprom":{"size":"512"}}],"ALVP":["The Lost Vikings",{"eeprom":{"size":"512"}}],"ALVE":["The Lost Vikings",{"eeprom":{"size":"512"}}],"ALHJ":["Love Hina Advance - Shukufuku no Kane wa Naru Kana",{"eeprom":{"size":"512"}}],"ALLP":["Lucky Luke - Wanted!",{}],"AGDE":["Lufia - The Ruins of Lore",{"sram":{"size":"32768"}}],"ALNJ":["Lunar Legend",{"sram":{"size":"32768"}}],"ALNE":["Lunar Legend",{"eeprom":{"size":"8192"}}],"AMLE":["M&M's - Blast!",{"eeprom":{"size":"512"}}],"BEME":["M&M's - Break 'em",{}],"BM9J":["MAER Heaven - Knockin' on Heaven's Door",{"sram":{"size":"32768"}}],"A5ME":["MLB SlugFest 20-04",{}],"A2XE":["MX 2002 featuring Ricky Carmichael",{}],"BGZP":["Madagascar",{"eeprom":{"size":"512"}}],"BGZX":["Madagascar",{"eeprom":{"size":"512"}}],"BGZS":["Madagascar",{"eeprom":{"size":"512"}}],"BGZE":["Madagascar",{"eeprom":{"size":"512"}}],"BGZI":["Madagascar",{"eeprom":{"size":"512"}}],"BGZJ":["Madagascar",{"eeprom":{"size":"512"}}],"BGZH":["Madagascar",{"eeprom":{"size":"512"}}],"BM7S":["Madagascar - Operacion Pinguino",{"eeprom":{"size":"512"}}],"BM7E":["Madagascar - Operation Penguin",{"eeprom":{"size":"512"}}],"BM7P":["Madagascar - Operation Penguin",{"eeprom":{"size":"512"}}],"BM7X":["Madagascar - Operation Penguin",{"eeprom":{"size":"512"}}],"BM7Y":["Madagascar - Operation Penguin",{"eeprom":{"size":"512"}}],"B6ME":["Madden NFL 06",{"eeprom":{"size":"8192"}}],"B7ME":["Madden NFL 07",{"eeprom":{"size":"8192"}}],"A2ME":["Madden NFL 2002",{"eeprom":{"size":"512"}}],"ANJE":["Madden NFL 2003",{"eeprom":{"size":"8192"}}],"BMDE":["Madden NFL 2004",{"eeprom":{"size":"8192"}}],"BMFE":["Madden NFL 2005",{"eeprom":{"size":"8192"}}],"AZWJ":["Made in Wario",{"sram":{"size":"32768"}}],"A2IJ":["Magi Nation",{"eeprom":{"size":"8192"}}],"AJOJ":["Magical Houshin",{"flash":{"size":"65536"}}],"AQMP":["Magical Quest 2 Starring Mickey & Minnie",{"eeprom":{"size":"512"}}],"AQME":["Magical Quest 2 Starring Mickey & Minnie",{"eeprom":{"size":"512"}}],"BMQE":["Magical Quest 3 Starring Mickey & Donald",{"eeprom":{"size":"512"}}],"BMQP":["Magical Quest 3 Starring Mickey & Donald",{"eeprom":{"size":"512"}}],"A3MP":["Magical Quest Starring Mickey & Minnie",{"eeprom":{"size":"512"}}],"A3ME":["Magical Quest Starring Mickey & Minnie",{"eeprom":{"size":"512"}}],"AMVJ":["Magical Vacation",{"flash":{"size":"65536"}}],"AMPJ":["Mahjong Keiji",{"sram":{"size":"32768"}}],"BNGJ":["Mahou Sensei Negima! - Private Lesson - Damedesuu Toshokan-jima",{"sram":{"size":"32768"}}],"BNMJ":["Mahou Sensei Negima! - Private Lesson 2 - Ojamashimasuu Parasite de Chuu",{"sram":{"size":"32768"}}],"AWNJ":["Mahou no Pumpkin - Ann to Greg no Daibouken",{"eeprom":{"size":"512"}}],"AMCJ":["Mail de Cute",{"flash":{"size":"65536"}}],"BRQE":["Majesco's Rec Room Challenge",{}],"BRQP":["Majesco's Rec Room Challenge",{}],"B3NE":["Majesco's Sports Pack",{}],"B3NP":["Majesco's Sports Pack",{}],"BWAJ":["Majokko Cream-chan no Gokko Series 1 - Wannyan Idol Gakuen",{"eeprom":{"size":"512"}}],"BE2J":["Majokko Cream-chan no Gokko Series 2 - Kisekae Angel",{"eeprom":{"size":"512"}}],"ACOJ":["Manga-ka Debut Monogatari",{"eeprom":{"size":"8192"}}],"AMRP":["Maniac Racers Advance",{"eeprom":{"size":"512"}}],"A4MP":["Manic Miner",{}],"BQLE":["March of the Penguins",{}],"BQLP":["March of the Penguins",{}],"ANSJ":["Marie, Elie & Anis no Atelier - Soyokaze kara no Dengon",{"eeprom":{"size":"8192"}}],"A88P":["Mario & Luigi - Superstar Saga",{"eeprom":{"size":"8192"}}],"A88E":["Mario & Luigi - Superstar Saga",{"eeprom":{"size":"8192"}}],"A88J":["Mario & Luigi RPG",{"eeprom":{"size":"8192"}}],"BMGI":["Mario Golf - Advance Tour",{"sram":{"size":"32768"}}],"BMGF":["Mario Golf - Advance Tour",{"sram":{"size":"32768"}}],"BMGU":["Mario Golf - Advance Tour",{"sram":{"size":"32768"}}],"BMGE":["Mario Golf - Advance Tour",{"sram":{"size":"32768"}}],"BMGD":["Mario Golf - Advance Tour",{"sram":{"size":"32768"}}],"BMGS":["Mario Golf - Advance Tour",{"sram":{"size":"32768"}}],"BMGP":["Mario Golf - Advance Tour",{"sram":{"size":"32768"}}],"BMGJ":["Mario Golf - GBA Tour",{"sram":{"size":"32768"}}],"AMKE":["Mario Kart - Super Circuit",{"flash":{"size":"65536"}}],"AMKP":["Mario Kart - Super Circuit",{"flash":{"size":"65536"}}],"AMKJ":["Mario Kart Advance",{"flash":{"size":"65536"}}],"B8MJ":["Mario Party Advance",{"eeprom":{"size":"8192"}}],"B8ME":["Mario Party Advance",{"eeprom":{"size":"8192"}}],"B8MP":["Mario Party Advance",{"eeprom":{"size":"8192"}}],"BMVE":["Mario Pinball Land",{"eeprom":{"size":"512"}}],"BTMP":["Mario Power Tennis",{"sram":{"size":"32768"}}],"BTME":["Mario Tennis - Power Tour",{"sram":{"size":"32768"}}],"BTMJ":["Mario Tennis Advance",{"sram":{"size":"32768"}}],"BM5P":["Mario vs. Donkey Kong",{"flash":{"size":"65536"}}],"BM5E":["Mario vs. Donkey Kong",{"flash":{"size":"65536"}}],"BM5J":["Mario vs. Donkey Kong",{"flash":{"size":"65536"}}],"B4MP":["Marvel - Ultimate Alliance",{"eeprom":{"size":"512"}}],"B4ME":["Marvel - Ultimate Alliance",{"eeprom":{"size":"512"}}],"AKSE":["Mary-Kate and Ashley - Girls Night Out",{"eeprom":{"size":"512"}}],"AAYE":["Mary-Kate and Ashley Sweet 16 - Licensed to Drive",{}],"AGUE":["Masters of the Universe He-Man - Power of Grayskull",{}],"AHOE":["Mat Hoffman's Pro BMX",{"eeprom":{"size":"512"}}],"AHOX":["Mat Hoffman's Pro BMX",{"eeprom":{"size":"512"}}],"AH2E":["Mat Hoffman's Pro BMX 2",{"eeprom":{"size":"512"}}],"BMRJ":["Matantei Loki Ragnarok - Gensou no Labyrinth",{"eeprom":{"size":"8192"}}],"ARQP":["Matchbox Cross Town Heroes",{}],"ARQE":["Matchbox Cross Town Heroes",{}],"BIYE":["Math Patrol - The Kleptoid Threat",{"eeprom":{"size":"512"}}],"RZWJ":["Mawaru - Made in Wario",{"sram":{"size":"32768"}}],"BMEE":["Max Payne",{"eeprom":{"size":"512"}}],"BMEP":["Max Payne Advance",{"eeprom":{"size":"512"}}],"BEEP":["Maya the Bee - Sweet Gold",{"eeprom":{"size":"512"}}],"ABVP":["Maya the Bee - The Great Adventure",{}],"BFQE":["Mazes of Fate",{"eeprom":{"size":"8192"}}],"AKGP":["Mech Platoon",{"eeprom":{"size":"8192"}}],"AKGE":["Mech Platoon",{"eeprom":{"size":"8192"}}],"A8BE":["Medabots - Metabee",{"eeprom":{"size":"8192"}}],"A8BS":["Medabots - Metabee",{"eeprom":{"size":"8192"}}],"A8BP":["Medabots - Metabee",{"eeprom":{"size":"8192"}}],"A9BE":["Medabots - Rokusho",{"eeprom":{"size":"8192"}}],"A9BS":["Medabots - Rokusho",{"eeprom":{"size":"8192"}}],"A9BP":["Medabots - Rokusho",{"eeprom":{"size":"8192"}}],"AK8E":["Medabots AX - Metabee Ver.",{"eeprom":{"size":"8192"}}],"AK8P":["Medabots AX - Metabee Ver.",{"eeprom":{"size":"8192"}}],"AK9P":["Medabots AX - Rokusho Ver.",{"eeprom":{"size":"8192"}}],"AK9E":["Medabots AX - Rokusho Ver.",{"eeprom":{"size":"8192"}}],"BMHE":["Medal of Honor - Infiltrator",{"eeprom":{"size":"512"}}],"AUGP":["Medal of Honor - Underground",{}],"AUGE":["Medal of Honor - Underground",{}],"AUGX":["Medal of Honor - Underground",{}],"BMHJ":["Medal of Honor Advance",{"eeprom":{"size":"512"}}],"AGHJ":["Medarot G - Kabuto",{"eeprom":{"size":"8192"}}],"AGIJ":["Medarot G - Kuwagata",{"eeprom":{"size":"8192"}}],"ANAJ":["Medarot Navi - Kabuto",{"flash":{"size":"65536"}}],"AVIJ":["Medarot Navi - Kuwagata",{"flash":{"size":"65536"}}],"A5KJ":["Medarot Ni Core - Kabuto",{"eeprom":{"size":"8192"}}],"A5QJ":["Medarot Ni Core - Kuwagata",{"eeprom":{"size":"8192"}}],"BRHE":["Meet the Robinsons",{"eeprom":{"size":"512"}}],"BRHP":["Meet the Robinsons",{"eeprom":{"size":"512"}}],"A6ME":["Mega Man & Bass",{"eeprom":{"size":"8192"}}],"A6MP":["Mega Man & Bass",{"eeprom":{"size":"8192"}}],"A89P":["Mega Man Battle Chip Challenge",{"sram":{"size":"32768"}}],"A89E":["Mega Man Battle Chip Challenge",{"sram":{"size":"32768"}}],"AREP":["Mega Man Battle Network",{"sram":{"size":"32768"}}],"AREE":["Mega Man Battle Network",{"sram":{"size":"32768"}}],"AE2E":["Mega Man Battle Network 2",{"sram":{"size":"32768"}}],"AM2P":["Mega Man Battle Network 2",{"sram":{"size":"32768"}}],"A3XP":["Mega Man Battle Network 3 - Blue",{"sram":{"size":"32768"}}],"A3XE":["Mega Man Battle Network 3 - Blue Version",{"sram":{"size":"32768"}}],"A6BP":["Mega Man Battle Network 3 - White",{"sram":{"size":"32768"}}],"A6BE":["Mega Man Battle Network 3 - White Version",{"sram":{"size":"32768"}}],"B4BP":["Mega Man Battle Network 4 - Blue Moon",{"sram":{"size":"32768"}}],"B4BE":["Mega Man Battle Network 4 - Blue Moon",{"sram":{"size":"32768"}}],"B4WP":["Mega Man Battle Network 4 - Red Sun",{"sram":{"size":"32768"}}],"B4WE":["Mega Man Battle Network 4 - Red Sun",{"sram":{"size":"32768"}}],"BRKP":["Mega Man Battle Network 5 - Team Colonel",{"sram":{"size":"32768"}}],"BRKE":["Mega Man Battle Network 5 - Team Colonel",{"sram":{"size":"32768"}}],"BRBP":["Mega Man Battle Network 5 - Team Proto Man",{"sram":{"size":"32768"}}],"BRBE":["Mega Man Battle Network 5 - Team Proto Man",{"sram":{"size":"32768"}}],"BR6E":["Mega Man Battle Network 6 - Cybeast Falzar",{"sram":{"size":"32768"}}],"BR6P":["Mega Man Battle Network 6 - Cybeast Falzar",{"sram":{"size":"32768"}}],"BR5P":["Mega Man Battle Network 6 - Cybeast Gregar",{"sram":{"size":"32768"}}],"BR5E":["Mega Man Battle Network 6 - Cybeast Gregar",{"sram":{"size":"32768"}}],"AZCE":["Mega Man Zero",{"sram":{"size":"32768"}}],"A62P":["Mega Man Zero 2",{"sram":{"size":"32768"}}],"A62E":["Mega Man Zero 2",{"sram":{"size":"32768"}}],"BZ3P":["Mega Man Zero 3",{"sram":{"size":"32768"}}],"BZ3E":["Mega Man Zero 3",{"sram":{"size":"32768"}}],"B4ZP":["Mega Man Zero 4",{"eeprom":{"size":"8192"}}],"B4ZE":["Mega Man Zero 4",{"eeprom":{"size":"8192"}}],"BQVP":["Meine Tierarztpraxis",{"eeprom":{"size":"8192"}}],"BQTP":["Meine Tierpension",{"eeprom":{"size":"8192"}}],"BQAJ":["Meitantei Conan - Akatsuki no Monument",{"eeprom":{"size":"8192"}}],"AC4J":["Meitantei Conan - Nerawareta Tantei",{"eeprom":{"size":"8192"}}],"AMIP":["Men in Black - The Series",{}],"AMIE":["Men in Black - The Series",{}],"BMAJ":["Mermaid Melody - Pichi Pichi Pitch",{"sram":{"size":"32768"}}],"BM8J":["Mermaid Melody - Pichi Pichi Pitch - Pichi Pichi Party",{"sram":{"size":"32768"}}],"B3MJ":["Mermaid Melody - Pichi Pichi Pitch - Pichi Pichitto Live Start!",{"sram":{"size":"32768"}}],"A9TJ":["Metal Max 2 Kai",{"eeprom":{"size":"8192"}}],"BSME":["Metal Slug Advance",{"eeprom":{"size":"512"}}],"BSMJ":["Metal Slug Advance",{"eeprom":{"size":"512"}}],"BSMP":["Metal Slug Advance",{"eeprom":{"size":"512"}}],"AAPJ":["Metalgun Slinger",{"eeprom":{"size":"8192"}}],"BMXJ":["Metroid - Zero Mission",{"sram":{"size":"32768"}}],"BMXP":["Metroid - Zero Mission",{"sram":{"size":"32768"}}],"BMXE":["Metroid - Zero Mission",{"sram":{"size":"32768"}}],"AMTJ":["Metroid Fusion",{"sram":{"size":"32768"}}],"AMTE":["Metroid Fusion",{"sram":{"size":"32768"}}],"AMTP":["Metroid Fusion",{"sram":{"size":"32768"}}],"BMKJ":["Mezase! Koushien",{"flash":{"size":"65536"}}],"BM4J":["Mickey no Pocket Resort",{"eeprom":{"size":"512"}}],"BM3J":["Mickey to Donald no Magical Quest 3",{"eeprom":{"size":"512"}}],"A3MJ":["Mickey to Minnie no Magical Quest",{"eeprom":{"size":"512"}}],"A29J":["Mickey to Minnie no Magical Quest 2",{"eeprom":{"size":"512"}}],"AXZP":["Micro Machines",{}],"AMQP":["Midnight Club - Street Racing",{}],"AMQE":["Midnight Club - Street Racing",{}],"AM3E":["Midway's Greatest Arcade Hits",{}],"BMBE":["Mighty Beanz Pocket Puzzles",{"eeprom":{"size":"512"}}],"BQTX":["Mijn Dierenpension",{"eeprom":{"size":"8192"}}],"BQVX":["Mijn Dierenpraktijk",{"eeprom":{"size":"8192"}}],"AM9P":["Mike Tyson Boxing",{"eeprom":{"size":"512"}}],"AM6E":["Mike Tyson Boxing",{"eeprom":{"size":"512"}}],"AODJ":["Minami no Umi no Odyssey",{"eeprom":{"size":"512"}}],"AHCJ":["Mini Moni. - Mika no Happy Morning Chatty",{"sram":{"size":"32768"}}],"AOHJ":["Mini Moni. - Onegai Ohoshi-sama!",{"eeprom":{"size":"512"}}],"APYJ":["Minna de Puyo Puyo",{"eeprom":{"size":"512"}}],"BMOJ":["Minna no Ouji-sama",{"sram":{"size":"32768"}}],"BKKJ":["Minna no Shiiku Series - Boku no Kabuto, Kuwagata",{"eeprom":{"size":"8192"}}],"AB7J":["Minna no Shiiku Series 1 - Boku no Kabutomushi",{"sram":{"size":"32768"}}],"AW7J":["Minna no Shiiku Series 2 - Boku no Kuwagata",{"sram":{"size":"32768"}}],"BTLJ":["Minna no Soft Series - Happy Trump 20",{"eeprom":{"size":"512"}}],"BHYJ":["Minna no Soft Series - Hyokkori Hyoutan-jima - Don Gabacho Daikatsuyaku no Maki",{"eeprom":{"size":"512"}}],"BMJJ":["Minna no Soft Series - Minna no Mahjong",{"eeprom":{"size":"512"}}],"BSGJ":["Minna no Soft Series - Minna no Shougi",{"eeprom":{"size":"512"}}],"BUOJ":["Minna no Soft Series - Numpla Advance",{"eeprom":{"size":"8192"}}],"BSHJ":["Minna no Soft Series - Shanghai",{"eeprom":{"size":"512"}}],"BTTJ":["Minna no Soft Series - Tetris Advance",{"eeprom":{"size":"512"}}],"BMZJ":["Minna no Soft Series - Zooo",{"eeprom":{"size":"8192"}}],"ARME":["Minority Report - Everybody Runs",{"eeprom":{"size":"512"}}],"B3IJ":["Mirakuru! Panzou - 7-tsu no Hoshi no Uchuu Kaizoku",{"eeprom":{"size":"512"}}],"AIHE":["Mission Impossible - Operation Surma",{"eeprom":{"size":"512"}}],"AIHP":["Mission Impossible - Operation Surma",{"eeprom":{"size":"512"}}],"BMXC":["Miteluode - Lingdian Renwu",{"sram":{"size":"32768"}}],"AMTC":["Miteluode Ronghe",{"sram":{"size":"32768"}}],"AMBJ":["Mobile Pro Yakyuu - Kantoku no Saihai",{"flash":{"size":"65536"}}],"BGNE":["Mobile Suit Gundam Seed - Battle Assault",{}],"BJCJ":["Moero!! Jaleco Collection",{}],"BM2J":["Momotarou Dentetsu G Gold Deck o Tsukure!",{"eeprom":{"size":"8192"}}],"AMMJ":["Momotarou Matsuri",{"sram":{"size":"32768"}}],"BUME":["Monopoly",{}],"BUMP":["Monopoly",{}],"AMXD":["Die Monster AG",{}],"AMFJ":["Monster Farm Advance",{"sram":{"size":"32768"}}],"A2QJ":["Monster Farm Advance 2",{"sram":{"size":"32768"}}],"AM8P":["Monster Force",{"eeprom":{"size":"512"}}],"AM8E":["Monster Force",{"eeprom":{"size":"512"}}],"ANFJ":["Monster Gate",{"sram":{"size":"32768"}}],"A6GJ":["Monster Gate - Ooinaru Dungeon - Fuuin no Orb",{"sram":{"size":"32768"}}],"AMNJ":["Monster Guardians",{"sram":{"size":"32768"}}],"BQ7X":["Monster House",{"eeprom":{"size":"512"}}],"BQ7E":["Monster House",{"eeprom":{"size":"512"}}],"BQ7P":["Monster House",{"eeprom":{"size":"512"}}],"AJAE":["Monster Jam - Maximum Destruction",{"sram":{"size":"32768"}}],"AJAP":["Monster Jam - Maximum Destruction",{"sram":{"size":"32768"}}],"AA4J":["Monster Maker 4 - Flash Card",{"sram":{"size":"32768"}}],"AA5J":["Monster Maker 4 - Killer Dice",{"sram":{"size":"32768"}}],"AMFE":["Monster Rancher Advance",{"sram":{"size":"32768"}}],"A2QE":["Monster Rancher Advance 2",{"sram":{"size":"32768"}}],"A3NJ":["Monster Summoner",{"sram":{"size":"32768"}}],"BMTE":["Monster Truck Madness",{"eeprom":{"size":"512"}}],"BMCE":["Monster Trucks",{}],"BYME":["Monster Trucks Mayhem",{}],"BYMP":["Monster Trucks Mayhem",{}],"A4BE":["Monster! Bass Fishing",{}],"A4BP":["Monster! Bass Fishing",{}],"AMXE":["Monsters, Inc.",{}],"AMXX":["Monsters, Inc.",{}],"AMXJ":["Monsters, Inc.",{}],"AMXY":["Monsters, Inc.",{}],"AU3P":["Moorhen 3 - The Chicken Chase!",{"eeprom":{"size":"512"}}],"AMSJ":["Morita Shougi Advance",{"sram":{"size":"32768"}}],"AXDP":["Mortal Kombat - Deadly Alliance",{"eeprom":{"size":"512"}}],"AXDE":["Mortal Kombat - Deadly Alliance",{"eeprom":{"size":"512"}}],"AW4E":["Mortal Kombat - Tournament Edition",{"eeprom":{"size":"512"}}],"AM5E":["Mortal Kombat Advance",{}],"AM5P":["Mortal Kombat Advance",{}],"A2UJ":["Mother 1+2",{"sram":{"size":"32768"}}],"A3UJ":["Mother 3",{"flash":{"size":"65536"}}],"AM4E":["Moto GP",{}],"AM4J":["Moto GP",{"eeprom":{"size":"512"}}],"AM4P":["Moto GP",{}],"AMRE":["Motocross Maniacs Advance",{"eeprom":{"size":"512"}}],"AMRJ":["Motocross Maniacs Advance",{"eeprom":{"size":"512"}}],"A9MP":["Motoracer Advance",{"sram":{"size":"32768"}}],"A9ME":["Motoracer Advance",{"sram":{"size":"32768"}}],"AZRP":["Mr Nutz",{}],"AD2P":["Mr. Driller 2",{"sram":{"size":"32768"}}],"BR2E":["Mr. Driller 2",{"sram":{"size":"32768"}}],"AD2J":["Mr. Driller 2",{"sram":{"size":"32768"}}],"AD5J":["Mr. Driller A - Fushigi na Pacteria",{"sram":{"size":"32768"}}],"BICJ":["Mr. Incredible",{}],"BIQJ":["Mr. Incredible - Kyouteki Underminer Toujou",{}],"BPCP":["Ms. Pac-Man - Maze Madness",{"eeprom":{"size":"512"}}],"BPCE":["Ms. Pac-Man - Maze Madness",{"eeprom":{"size":"512"}}],"BMLE":["Mucha Lucha! - Mascaritas of the Lost Code",{"eeprom":{"size":"512"}}],"AG6J":["Mugenborg",{"sram":{"size":"32768"}}],"AUME":["The Mummy",{}],"AUMP":["The Mummy",{}],"AMWP":["Muppet Pinball Mayhem",{"eeprom":{"size":"512"}}],"AMWE":["Muppet Pinball Mayhem",{"eeprom":{"size":"512"}}],"AZME":["The Muppets - On with the Show!",{}],"AMUJ":["Mutsu - Water Looper Mutsu",{"sram":{"size":"32768"}}],"BFRP":["My Animal Centre in Africa",{"eeprom":{"size":"8192"}}],"BL6E":["My Little Pony - Crystal Princess - The Runaway Rainbow",{}],"ANHE":["NASCAR Heat 2002",{"eeprom":{"size":"512"}}],"ABNE":["NBA Jam 2002",{}],"ABZE":["NFL Blitz 20-02",{}],"ANKE":["NFL Blitz 20-03",{}],"ANLE":["NHL 2002",{"eeprom":{"size":"8192"}}],"AN4E":["NHL Hitz 20-03",{"eeprom":{"size":"512"}}],"AKPJ":["Nakayoshi Mahjong - KabuReach",{"sram":{"size":"32768"}}],"AH7J":["Nakayoshi Pet Advance Series 1 - Kawaii Hamster",{"eeprom":{"size":"8192"}}],"AI7J":["Nakayoshi Pet Advance Series 2 - Kawaii Koinu",{"eeprom":{"size":"8192"}}],"AN3J":["Nakayoshi Pet Advance Series 3 - Kawaii Koneko",{"eeprom":{"size":"8192"}}],"BKIJ":["Nakayoshi Pet Advance Series 4 - Kawaii Koinu Mini - Wankoto Asobou!! Kogata-ken",{"eeprom":{"size":"8192"}}],"AHVJ":["Nakayoshi Youchien - Sukoyaka Enji Ikusei Game",{"eeprom":{"size":"8192"}}],"ANMJ":["Namco Museum",{}],"ANME":["Namco Museum",{}],"ANMP":["Namco Museum",{}],"B5NE":["Namco Museum - 50th Anniversary",{}],"B5NP":["Namco Museum - 50th Anniversary",{}],"ANDE":["Nancy Drew - Message in a Haunted Mansion",{}],"ANPJ":["Napoleon",{"sram":{"size":"32768"}}],"AYRJ":["Narikiri Jockey Game - Yuushun Rhapsody",{"sram":{"size":"32768"}}],"AUEJ":["Naruto - Konoha Senki",{"sram":{"size":"32768"}}],"A7AE":["Naruto - Ninja Council",{"eeprom":{"size":"512"}}],"BN2E":["Naruto - Ninja Council 2",{"sram":{"size":"32768"}}],"A7AJ":["Naruto - Ninjutsu Zenkai! Saikyou Ninja Daikesshuu",{"sram":{"size":"32768"}}],"BN2J":["Naruto - Saikyou Ninja Daikesshuu 2",{"sram":{"size":"32768"}}],"BNRJ":["Naruto RPG - Uketsugareshi Hi no Ishi",{"sram":{"size":"32768"}}],"AN2J":["Natural 2 - Duo",{"flash":{"size":"65536"}}],"BNWE":["Need for Speed - Most Wanted",{"eeprom":{"size":"512"}}],"AZFP":["Need for Speed - Porsche Unleashed",{"eeprom":{"size":"512"}}],"AZFE":["Need for Speed - Porsche Unleashed",{"eeprom":{"size":"512"}}],"BNSE":["Need for Speed - Underground",{"eeprom":{"size":"512"}}],"BNFE":["Need for Speed - Underground 2",{"eeprom":{"size":"512"}}],"BN7E":["Need for Speed Carbon - Own the City",{"eeprom":{"size":"512"}}],"ARNJ":["Neoromance Game - Harukanaru Toki no Naka de",{"eeprom":{"size":"8192"}}],"ATXP":["Next Generation Tennis",{"eeprom":{"size":"512"}}],"BUJE":["Nicktoons - Attack of the Toybots",{}],"BNVE":["Nicktoons - Battle for Volcano Island",{"eeprom":{"size":"512"}}],"BCCE":["Nicktoons - Freeze Frame Frenzy",{"eeprom":{"size":"512"}}],"ANQP":["Nicktoons Racing",{"eeprom":{"size":"512"}}],"ANQE":["Nicktoons Racing",{"eeprom":{"size":"512"}}],"BNUE":["Nicktoons Unite!",{}],"ANTJ":["Nihon Pro Mahjong Renmei Kounin - Tetsuman Advance - Menkyo Kaiden Series",{"eeprom":{"size":"8192"}}],"ANXP":["Ninja Cop",{"eeprom":{"size":"512"}}],"ANXE":["Ninja Five-0",{"eeprom":{"size":"512"}}],"BKRJ":["No No No Puzzle Chailien",{"eeprom":{"size":"512"}}],"AGPE":["No Rules - Get Phat",{}],"ANOJ":["Nobunaga Ibun",{"sram":{"size":"32768"}}],"ANBJ":["Nobunaga no Yabou",{"flash":{"size":"65536"}}],"BNKE":["Noddy - A Day in Toyland",{}],"BNKP":["Noddy - A Day in Toyland",{}],"BH5F":["Nos Voisins, les Hommes",{"eeprom":{"size":"512"}}],"BNYJ":["Nyan Nyan Nyanko no NyanCollection",{"eeprom":{"size":"512"}}],"BIKJ":["Ochaken Kururin - Honwaka Puzzle de Hotto Shiyo",{"eeprom":{"size":"8192"}}],"BO2J":["Ochaken no Bouken-jima - Honwaka Yume no Island",{"eeprom":{"size":"8192"}}],"BDRJ":["Ochaken no Heya",{"eeprom":{"size":"512"}}],"BCUJ":["Ochaken no Yume Bouken",{"eeprom":{"size":"512"}}],"BODD":["Oddworld - Munch's Oddysee",{}],"BODE":["Oddworld - Munch's Oddysee",{}],"A87J":["Ohanaya-san Monogatari GBA - Iyashikei Ohanaya-san Ikusei Game",{"eeprom":{"size":"8192"}}],"BOJJ":["Ojarumaru - Gekkouchou Sanpo de Ojaru",{"eeprom":{"size":"512"}}],"AOKJ":["Okumanchouja Game - Nottori Daisakusen!",{"sram":{"size":"32768"}}],"BONE":["One Piece",{"eeprom":{"size":"512"}}],"BIPJ":["One Piece - Dragon Dream",{"eeprom":{"size":"8192"}}],"BO8K":["One Piece - Going Baseball - Haejeok Yaku",{"eeprom":{"size":"8192"}}],"B08J":["One Piece - Going Baseball - Kaizoku Yakyuu",{"eeprom":{"size":"8192"}}],"AO7K":["One Piece - Ilgop Seomui Debomool",{"sram":{"size":"32768"}}],"A6OE":["Onimusha Tactics",{"eeprom":{"size":"8192"}}],"A6OJ":["Onimusha Tactics",{"eeprom":{"size":"8192"}}],"A6OP":["Onimusha Tactics",{"eeprom":{"size":"8192"}}],"BITJ":["Onmyou Taisenki Zeroshiki",{"eeprom":{"size":"8192"}}],"BOAP":["Open Season",{"eeprom":{"size":"512"}}],"BOAE":["Open Season",{"eeprom":{"size":"512"}}],"BOAX":["Open Season",{"eeprom":{"size":"512"}}],"BAAE":["Operation Armored Liberty",{}],"AORJ":["Oriental Blue - Ao no Tengai",{"sram":{"size":"32768"}}],"AICJ":["Oshaberi Inko Club",{"flash":{"size":"65536"}}],"AOPJ":["Oshare Princess",{"eeprom":{"size":"8192"}}],"AO2J":["Oshare Princess 2",{"eeprom":{"size":"8192"}}],"BO3J":["Oshare Princess 3",{"eeprom":{"size":"8192"}}],"BO5J":["Oshare Princess 5",{"eeprom":{"size":"512"}}],"A5SJ":["Oshare Wanko",{"eeprom":{"size":"8192"}}],"BOFD":["Ottifanten Pinball",{}],"AGSJ":["Ougon no Taiyou - Hirakareshi Fuuin",{"flash":{"size":"65536"}}],"AGFJ":["Ougon no Taiyou - Ushinawareshi Toki",{"flash":{"size":"65536"}}],"BH5E":["Over the Hedge",{"eeprom":{"size":"512"}}],"BH5P":["Over the Hedge",{"eeprom":{"size":"512"}}],"BH5H":["Over the Hedge - Beesten bij de Buren",{"eeprom":{"size":"512"}}],"BH7E":["Over the Hedge - Hammy Goes Nuts!",{"eeprom":{"size":"512"}}],"BH7P":["Over the Hedge - Hammy Goes Nuts!",{"eeprom":{"size":"512"}}],"BOZE":["Ozzy & Drix",{}],"BPVY":["Paard & Pony - Mijn Manege",{"eeprom":{"size":"8192"}}],"BYPY":["Paard & Pony - Paard in Galop",{"eeprom":{"size":"8192"}}],"APCP":["Pac-Man Collection",{}],"APCJ":["Pac-Man Collection",{}],"APCE":["Pac-Man Collection",{}],"BP8P":["Pac-Man Pinball Advance",{}],"BP8E":["Pac-Man Pinball Advance",{}],"BPAP":["Pac-Man World",{"eeprom":{"size":"512"}}],"BPAE":["Pac-Man World",{"eeprom":{"size":"512"}}],"B6PP":["Pac-Man World & Ms. Pac-Man - Maze Madness",{"eeprom":{"size":"512"}}],"B2CE":["Pac-Man World 2",{}],"B2CP":["Pac-Man World 2",{}],"BHBE":["Paws & Claws - Best Friends - Dogs & Cats",{"eeprom":{"size":"8192"}}],"BURE":["Paws & Claws - Pet Resort",{"eeprom":{"size":"8192"}}],"BPKP":["Payback",{"eeprom":{"size":"512"}}],"BPZJ":["Pazuninn - Umininn no Puzzle de Nimu",{"eeprom":{"size":"512"}}],"AQAP":["Penny Racers",{"sram":{"size":"32768"}}],"APPP":["Peter Pan - Return to Neverland",{}],"APPE":["Peter Pan - Return to Neverland",{}],"BPTE":["Peter Pan - The Motion Picture Event",{"eeprom":{"size":"8192"}}],"BPTP":["Peter Pan - The Motion Picture Event",{}],"AJHE":["Petz - Hamsterz Life 2",{"sram":{"size":"32768"}}],"BNBE":["Petz Vet",{"eeprom":{"size":"8192"}}],"BEFP":["Pferd & Pony - Best Friends - Mein Pferd",{"eeprom":{"size":"8192"}}],"BYPP":["Pferd & Pony - Lass Uns Reiten 2",{"eeprom":{"size":"8192"}}],"BHUP":["Pferd & Pony - Mein Gestuet",{"eeprom":{"size":"8192"}}],"BPVP":["Pferd & Pony - Mein Pferdehof",{"eeprom":{"size":"8192"}}],"B94D":["Pferd & Pony 2 in 1",{"eeprom":{"size":"8192"}}],"APXP":["Phalanx",{"eeprom":{"size":"512"}}],"APXE":["Phalanx",{"eeprom":{"size":"512"}}],"APXJ":["Phalanx",{"eeprom":{"size":"512"}}],"AYCP":["Phantasy Star Collection",{"eeprom":{"size":"8192"}}],"AYCE":["Phantasy Star Collection",{"eeprom":{"size":"8192"}}],"BFXE":["Phil of the Future",{"eeprom":{"size":"512"}}],"BP3J":["Pia Carrot he Youkoso!! 3.3",{"eeprom":{"size":"8192"}}],"A9NX":["Piglet's Big Game",{}],"A9NE":["Piglet's Big Game",{}],"BPNJ":["Pikapika Nurse Monogatari - Nurse Ikusei Game",{"eeprom":{"size":"8192"}}],"APZP":["Pinball Advance",{"eeprom":{"size":"512"}}],"APLP":["Pinball Challenge Deluxe",{}],"A2TP":["Pinball Tycoon",{}],"A2TE":["Pinball Tycoon",{}],"APDP":["The Pinball of the Dead",{"eeprom":{"size":"512"}}],"APDE":["The Pinball of the Dead",{"eeprom":{"size":"512"}}],"AZOJ":["The Pinball of the Dead",{"eeprom":{"size":"512"}}],"AP7P":["Pink Panther - Pinkadelic Pursuit",{}],"APEE":["Pink Panther - Pinkadelic Pursuit",{}],"APNJ":["Pinky Monkey Town",{"eeprom":{"size":"8192"}}],"APIP":["Pinky and the Brain - The Masterplan",{}],"AP6J":["Pinobee & Phoebee",{"eeprom":{"size":"512"}}],"APBE":["Pinobee - Wings of Adventure",{"sram":{"size":"32768"}}],"APBJ":["Pinobee no Daibouken",{"sram":{"size":"32768"}}],"BPVX":["Pippa Funnell - Stable Adventure",{"eeprom":{"size":"8192"}}],"BYPX":["Pippa Funnell 2",{"eeprom":{"size":"8192"}}],"B8QE":["Pirates of the Caribbean - Dead Man's Chest",{"eeprom":{"size":"512"}}],"A8QP":["Pirates of the Caribbean - The Curse of the Black Pearl",{}],"A8QE":["Pirates of the Caribbean - The Curse of the Black Pearl",{}],"BPHF":["Pitfall - L'Expedition Perdue",{"eeprom":{"size":"512"}}],"BPHE":["Pitfall - The Lost Expedition",{"eeprom":{"size":"512"}}],"BPHP":["Pitfall - The Lost Expedition",{"eeprom":{"size":"512"}}],"APFE":["Pitfall - The Mayan Adventure",{}],"BQ9Q":["Pixeline i Pixieland",{"eeprom":{"size":"512"}}],"APMP":["Planet Monsters",{}],"APME":["Planet Monsters",{}],"AYNE":["Planet of the Apes",{}],"AYNP":["Planet of the Apes",{}],"ASHJ":["Play Novel - Silent Hill",{"sram":{"size":"32768"}}],"BTDE":["Pocket Dogs",{"eeprom":{"size":"512"}}],"BPEJ":["Pocket Monsters - Emerald",{"flash":{"size":"131072"},"hasRTC":true}],"BPRJ":["Pocket Monsters - Fire Red",{"flash":{"size":"131072"}}],"B24J":["Pocket Monsters - Fushigi no Dungeon Aka no Kyuujotai",{"flash":{"size":"65536"}}],"BPGJ":["Pocket Monsters - Leaf Green",{"flash":{"size":"131072"}}],"AXVJ":["Pocket Monsters - Ruby",{"flash":{"size":"131072"},"hasRTC":true}],"AXPJ":["Pocket Monsters - Sapphire",{"flash":{"size":"131072"},"hasRTC":true}],"AP9P":["Pocket Music",{"sram":{"size":"32768"}}],"BPJE":["Pocket Professor - Kwik Notes - Vol. 1",{"eeprom":{"size":"512"}}],"APKE":["Pocky & Rocky with Becky",{}],"BTDJ":["Poke Inu",{"eeprom":{"size":"512"}}],"BPGD":["Pokemon - Blattgruene Edition",{"flash":{"size":"131072"}}],"BPES":["Pokemon - Edicion Esmeralda",{"flash":{"size":"131072"},"hasRTC":true}],"BPRS":["Pokemon - Edicion Rojo Fuego",{"flash":{"size":"131072"}}],"AXVS":["Pokemon - Edicion Rubi",{"flash":{"size":"131072"},"hasRTC":true}],"BPGS":["Pokemon - Edicion Verde Hoja",{"flash":{"size":"131072"}}],"AXPS":["Pokemon - Edicion Zafiro",{"flash":{"size":"131072"},"hasRTC":true}],"BPEE":["Pokemon - Emerald Version",{"flash":{"size":"131072"},"hasRTC":true}],"BPRD":["Pokemon - Feuerrote Edition",{"flash":{"size":"131072"}}],"BPRE":["Pokemon - Fire Red Version",{"flash":{"size":"131072"}}],"BPGE":["Pokemon - Leaf Green Version",{"flash":{"size":"131072"}}],"AXVD":["Pokemon - Rubin-Edition",{"flash":{"size":"131072"},"hasRTC":true}],"AXVE":["Pokemon - Ruby Version",{"flash":{"size":"131072"},"hasRTC":true}],"AXPD":["Pokemon - Saphir-Edition",{"flash":{"size":"131072"},"hasRTC":true}],"AXPE":["Pokemon - Sapphire Version",{"flash":{"size":"131072"},"hasRTC":true}],"BPED":["Pokemon - Smaragd-Edition",{"flash":{"size":"131072"},"hasRTC":true}],"BPEF":["Pokemon - Version Emeraude",{"flash":{"size":"131072"},"hasRTC":true}],"BPRF":["Pokemon - Version Rouge Feu",{"flash":{"size":"131072"}}],"AXVF":["Pokemon - Version Rubis",{"flash":{"size":"131072"},"hasRTC":true}],"AXPF":["Pokemon - Version Saphir",{"flash":{"size":"131072"},"hasRTC":true}],"BPGF":["Pokemon - Version Vert Feuille",{"flash":{"size":"131072"}}],"BPRI":["Pokemon - Versione Rosso Fuoco",{"flash":{"size":"131072"}}],"AXVI":["Pokemon - Versione Rubino",{"flash":{"size":"131072"},"hasRTC":true}],"BPEI":["Pokemon - Versione Smeraldo",{"flash":{"size":"131072"},"hasRTC":true}],"BPGI":["Pokemon - Versione Verde Foglia",{"flash":{"size":"131072"}}],"AXPI":["Pokemon - Versione Zaffiro",{"flash":{"size":"131072"},"hasRTC":true}],"B24P":["Pokemon Mystery Dungeon - Red Rescue Team",{"flash":{"size":"131072"}}],"B24E":["Pokemon Mystery Dungeon - Red Rescue Team",{"flash":{"size":"131072"}}],"BPPJ":["Pokemon Pinball - Ruby & Sapphire",{"sram":{"size":"32768"}}],"BPPE":["Pokemon Pinball - Ruby & Sapphire",{"sram":{"size":"32768"}}],"BPPP":["Pokemon Pinball - Ruby & Sapphire",{"sram":{"size":"32768"}}],"BPXE":["The Polar Express",{"eeprom":{"size":"512"}}],"BIIE":["Polarium Advance",{"flash":{"size":"65536"}}],"BIIP":["Polarium Advance",{"flash":{"size":"65536"}}],"AOTP":["Polly Pocket! - Super Splash Island",{}],"AOTE":["Polly Pocket! - Super Splash Island",{}],"B3FE":["Polly Pocket! - Super Splash Island",{}],"B3FP":["Polly Pocket! - Super Splash Island",{}],"BIDP":["Pop Idol",{}],"APOE":["Popeye - Rush for Spinach",{}],"BROP":["Postman Pat and the Greendale Rocket",{}],"BBQJ":["Power Poke Dash",{"sram":{"size":"32768"}}],"B8PJ":["Power Pro Kun Pocket 1, 2",{"sram":{"size":"32768"}}],"AP3J":["Power Pro Kun Pocket 3",{"sram":{"size":"32768"}}],"AP4J":["Power Pro Kun Pocket 4",{"sram":{"size":"32768"}}],"A5PJ":["Power Pro Kun Pocket 5",{"sram":{"size":"32768"}}],"BP6J":["Power Pro Kun Pocket 6",{"sram":{"size":"32768"}}],"BP7J":["Power Pro Kun Pocket 7",{"sram":{"size":"32768"}}],"BPOX":["Power Rangers - Dino Thunder",{}],"BPOE":["Power Rangers - Dino Thunder",{}],"APRF":["Power Rangers - La Force du Temps",{}],"BPWP":["Power Rangers - Ninja Storm",{}],"BPWE":["Power Rangers - Ninja Storm",{}],"APRD":["Power Rangers - Time Force",{}],"APRE":["Power Rangers - Time Force",{}],"APWE":["Power Rangers - Wild Force",{}],"BRDE":["Power Rangers S.P.D.",{}],"BRDX":["Power Rangers S.P.D.",{}],"BRDY":["Power Rangers S.P.D.",{}],"AP5P":["The Powerpuff Girls - Him and Seek",{"eeprom":{"size":"512"}}],"AP5E":["The Powerpuff Girls - Him and Seek",{"eeprom":{"size":"512"}}],"APTE":["The Powerpuff Girls - Mojo Jojo A-Go-Go",{"eeprom":{"size":"512"}}],"APTP":["The Powerpuff Girls - Mojo Jojo A-Go-Go",{"eeprom":{"size":"512"}}],"APHE":["Prehistorik Man",{}],"BAQP":["Premier Action Soccer",{"eeprom":{"size":"8192"}}],"BPMP":["Premier Manager 2003-04",{"flash":{"size":"65536"}}],"BP4P":["Premier Manager 2004-2005",{"flash":{"size":"65536"}}],"BP5P":["Premier Manager 2005-2006",{"flash":{"size":"65536"}}],"BPYP":["Prince of Persia - The Sands of Time",{"eeprom":{"size":"512"}}],"BPYE":["Prince of Persia - The Sands of Time",{"eeprom":{"size":"512"}}],"B2QP":["Prince of Persia - The Sands of Time & Lara Croft Tomb Raider - The Prophecy",{"eeprom":{"size":"512"}}],"BNPE":["Princess Natasha - Student, Secret Agent, Princess",{}],"BNPP":["Princess Natasha - Student, Secret Agent, Princess",{}],"AVEP":["Pro Beach Soccer",{"eeprom":{"size":"512"}}],"B2OJ":["Pro Mahjong Tsuwamono GBA",{"eeprom":{"size":"8192"}}],"ATEP":["Pro Tennis WTA Tour",{"eeprom":{"size":"512"}}],"ALMJ":["Pro Yakyuu Team o Tsukurou! Advance",{"sram":{"size":"32768"}}],"BD7E":["The Proud Family",{"eeprom":{"size":"512"}}],"APUJ":["PukuPuku Tennen Kairanban",{"eeprom":{"size":"8192"}}],"BPQJ":["PukuPuku Tennen Kairanban - Koi no Cupid Daisakusen",{"eeprom":{"size":"8192"}}],"B3PJ":["PukuPuku Tennen Kairanban - Youkoso! Illusion Land he",{"eeprom":{"size":"8192"}}],"APGP":["Punch King - Arcade Boxing",{}],"APGE":["Punch King - Arcade Boxing",{}],"BYXE":["Puppy Luv - Spa and Resort",{"eeprom":{"size":"512"}}],"APYP":["Puyo Pop",{"eeprom":{"size":"512"}}],"APYE":["Puyo Pop",{"eeprom":{"size":"512"}}],"BPFP":["Puyo Pop Fever",{"eeprom":{"size":"512"}}],"BPFJ":["Puyo Puyo Fever",{"eeprom":{"size":"512"}}],"AEHJ":["Puzzle & Tantei Collection",{"eeprom":{"size":"8192"}}],"BPBJ":["Pyuu to Fuku! Jaguar - Byoo to Deru! Megane-kun",{"sram":{"size":"32768"}}],"BQDE":["Quad Desert Fury",{}],"A55F":["Qui Veut Gagner des Millions",{}],"A55S":["Quiere Ser Millonario",{}],"BR3P":["R-Type III - The Third Lightning",{}],"BR3E":["R-Type III - The Third Lightning",{}],"A8TJ":["RPG Tsukuru Advance",{"flash":{"size":"65536"}}],"BRWP":["Racing Fever",{}],"BRAE":["Racing Gears Advance",{"eeprom":{"size":"512"}}],"BRAP":["Racing Gears Advance",{"eeprom":{"size":"512"}}],"ARXE":["Rampage - Puzzle Attack",{}],"BRFE":["Rapala Pro Fishing",{"eeprom":{"size":"512"}}],"BNLX":["Ratatouille",{}],"BNLP":["Ratatouille",{}],"BNLE":["Ratatouille",{}],"BNLY":["Ratatouille",{}],"BRME":["Rave Master - Special Attack Force!",{"sram":{"size":"32768"}}],"BX5P":["Rayman - 10th Anniversary",{"eeprom":{"size":"8192"}}],"BX5E":["Rayman - 10th Anniversary",{"eeprom":{"size":"8192"}}],"BRYE":["Rayman - Hoodlum's Revenge",{"eeprom":{"size":"512"}}],"BRYP":["Rayman - Hoodlums' Revenge",{"eeprom":{"size":"512"}}],"BQ3E":["Rayman - Raving Rabbids",{"eeprom":{"size":"512"}}],"BQ3P":["Rayman - Raving Rabbids",{"eeprom":{"size":"512"}}],"AYZE":["Rayman 3",{"eeprom":{"size":"512"}}],"AYZP":["Rayman 3",{"eeprom":{"size":"512"}}],"ARYE":["Rayman Advance",{"eeprom":{"size":"512"}}],"ARYP":["Rayman Advance",{"eeprom":{"size":"512"}}],"BALX":["Razbitume! - Restez Branches!",{"eeprom":{"size":"512"}}],"A5WF":["Les Razmoket Rencontrent les Delajungle",{}],"AR5F":["Les Razmoket - A Moi la Fiesta",{}],"ARGF":["Les Razmoket - Voler N'Est Pas Jouer",{}],"ARFE":["Razor Freestyle Scooter",{}],"AR2P":["Ready 2 Rumble Boxing - Round 2",{}],"AR2E":["Ready 2 Rumble Boxing - Round 2",{}],"BRLP":["Rebelstar - Tactical Command",{"eeprom":{"size":"8192"}}],"BRLE":["Rebelstar - Tactical Command",{"eeprom":{"size":"8192"}}],"ARHJ":["Recca no Honoo - The Game",{"sram":{"size":"32768"}}],"AR9P":["Reign of Fire",{}],"AR9E":["Reign of Fire",{}],"BR9J":["Relaxuma na Mainichi",{"eeprom":{"size":"512"}}],"AQHE":["Rescue Heroes - Billy Blazes!",{}],"A3RE":["The Revenge of Shinobi",{}],"A3RP":["The Revenge of Shinobi",{}],"BRIJ":["Rhythm Tengoku",{"sram":{"size":"32768"}}],"ARDE":["The Ripping Friends",{}],"BDTE":["River City Ransom EX",{"eeprom":{"size":"8192"}}],"BREE":["Riviera - The Promised Land",{"sram":{"size":"32768"}}],"BREJ":["Riviera - Yakusoku no Chi Riviera",{"sram":{"size":"32768"}}],"A9RE":["Road Rash - Jailbreak",{}],"A9RP":["Road Rash - Jailbreak",{}],"A6RE":["Road Trip - Shifting Gears",{"sram":{"size":"32768"}}],"ACVE":["Robopon 2 - Cross Version",{"flash":{"size":"65536"}}],"ARPE":["Robopon 2 - Ring Version",{"flash":{"size":"65536"}}],"ACVJ":["Robot Ponkottsu 2 - Cross Version",{"flash":{"size":"65536"}}],"ARPJ":["Robot Ponkottsu 2 - Ring Version",{"flash":{"size":"65536"}}],"ARWP":["Robot Wars - Advanced Destruction",{"eeprom":{"size":"512"}}],"ARUE":["Robot Wars - Advanced Destruction",{"eeprom":{"size":"512"}}],"ARSP":["Robot Wars - Extreme Destruction",{"eeprom":{"size":"512"}}],"ARBE":["Robotech - The Macross Saga",{"eeprom":{"size":"512"}}],"BRTJ":["Robots",{"eeprom":{"size":"512"}}],"BRTE":["Robots",{"eeprom":{"size":"512"}}],"BRTP":["Robots",{"eeprom":{"size":"512"}}],"A4RP":["Rock n' Roll Racing",{"eeprom":{"size":"512"}}],"A4RE":["Rock n' Roll Racing",{"eeprom":{"size":"512"}}],"BR7P":["Rock'em Sock'em Robots",{}],"BR7E":["Rock'em Sock'em Robots",{}],"AR4E":["Rocket Power - Beach Bandits",{}],"ARKE":["Rocket Power - Dream Scheme",{}],"ARKF":["Rocket Power - Le Cauchemar d'Otto",{}],"AZZE":["Rocket Power - Zero Gravity Zone",{}],"AFCJ":["Rockman & Forte",{"eeprom":{"size":"8192"}}],"B4BJ":["Rockman EXE 4 - Tournament Blue Moon",{"sram":{"size":"32768"}}],"B4WJ":["Rockman EXE 4 - Tournament Red Sun",{"sram":{"size":"32768"}}],"BR4J":["Rockman EXE 4.5 - Real Operation",{"flash":{"size":"65536"},"hasRTC":true}],"BRBJ":["Rockman EXE 5 - Team of Blues",{"sram":{"size":"32768"}}],"BRKJ":["Rockman EXE 5 - Team of Colonel",{"sram":{"size":"32768"}}],"BR6J":["Rockman EXE 6 - Dennoujuu Falzar",{"sram":{"size":"32768"}}],"BR5J":["Rockman EXE 6 - Dennoujuu Gregar",{"sram":{"size":"32768"}}],"A89J":["Rockman EXE Battle Chip GP",{"sram":{"size":"32768"}}],"ARZJ":["Rockman Zero",{"sram":{"size":"32768"}}],"A62J":["Rockman Zero 2",{"sram":{"size":"32768"}}],"BZ3J":["Rockman Zero 3",{"sram":{"size":"32768"}}],"B4ZJ":["Rockman Zero 4",{"eeprom":{"size":"8192"}}],"AROP":["Rocky",{"eeprom":{"size":"512"}}],"AR8E":["Rocky",{"eeprom":{"size":"512"}}],"ARGE":["Rugrats - Castle Capers",{}],"A5WE":["Rugrats - Go Wild",{}],"AR5E":["Rugrats - I Gotta Go Party",{}],"ARGS":["Rugrats - Travesuras en el Castillo",{}],"BGEE":["SD Gundam Force",{"eeprom":{"size":"512"}}],"BG4J":["SD Gundam Force",{"eeprom":{"size":"512"}}],"BGAJ":["SD Gundam GGeneration Advance",{"eeprom":{"size":"8192"}}],"ATHJ":["SK8 - Tony Hawk's Pro Skater 2",{"eeprom":{"size":"512"}}],"BSXE":["SSX 3",{"eeprom":{"size":"512"}}],"AXYE":["SSX Tricky",{"eeprom":{"size":"512"}}],"AWUE":["Sabre Wulf",{"eeprom":{"size":"8192"}}],"AWUP":["Sabre Wulf",{"eeprom":{"size":"8192"}}],"A3BP":["Sabrina - The Teenage Witch - Potion Commotion",{}],"A3BE":["Sabrina - The Teenage Witch - Potion Commotion",{}],"ASMJ":["Saibara Rieko no Dendou Mahjong",{"sram":{"size":"32768"}}],"ACLJ":["Sakura Momoko no UkiUki Carnival",{"sram":{"size":"32768"}}],"AWGP":["Salt Lake 2002",{"eeprom":{"size":"512"}}],"AS5E":["Salt Lake 2002",{"eeprom":{"size":"512"}}],"ASNJ":["Samsara Naga 1x2",{"eeprom":{"size":"8192"}}],"AOSE":["Samurai Deeper Kyo",{"eeprom":{"size":"512"}}],"AOSJ":["Samurai Deeper Kyo",{"eeprom":{"size":"512"}}],"AECJ":["Samurai Evolution - Oukoku Geist",{"sram":{"size":"32768"}}],"AJTE":["Samurai Jack - The Amulet of Time",{"eeprom":{"size":"512"}}],"ASXJ":["Sangokushi",{"flash":{"size":"65536"}}],"B3EJ":["Sangokushi - Eiketsuden",{"flash":{"size":"65536"}}],"B3QJ":["Sangokushi - Koumeiden",{"flash":{"size":"65536"}}],"A85J":["Sanrio Puroland - All Characters",{"eeprom":{"size":"8192"}}],"AXXP":["Santa Claus Jr. Advance",{"eeprom":{"size":"512"}}],"AUZE":["Santa Claus Saves the Earth",{}],"B33E":["The Santa Clause 3 - The Escape Clause",{"eeprom":{"size":"512"}}],"A57J":["Scan Hunter - Sennen Kaigyo o Oe!",{"sram":{"size":"32768"}}],"AP8F":["Scooby-Doo",{"eeprom":{"size":"512"}}],"AP8P":["Scooby-Doo",{"eeprom":{"size":"512"}}],"AP8D":["Scooby-Doo",{"eeprom":{"size":"512"}}],"AP8S":["Scooby-Doo",{"eeprom":{"size":"512"}}],"AP8E":["Scooby-Doo",{"eeprom":{"size":"512"}}],"BMUX":["Scooby-Doo 2 - Monsters Unleashed",{}],"BMUE":["Scooby-Doo 2 - Monsters Unleashed",{}],"ASDX":["Scooby-Doo and the Cyber Chase",{}],"ASDE":["Scooby-Doo and the Cyber Chase",{}],"BMMP":["Scooby-Doo! - Mystery Mayhem",{"eeprom":{"size":"512"}}],"BMME":["Scooby-Doo! - Mystery Mayhem",{"eeprom":{"size":"512"}}],"B25Y":["Scooby-Doo! - Unmasked",{}],"B25X":["Scooby-Doo! - Unmasked",{}],"B25E":["Scooby-Doo! - Unmasked",{}],"ASZP":["The Scorpion King - Sword of Osiris",{}],"ASZE":["The Scorpion King - Sword of Osiris",{}],"AQBP":["Scrabble",{"sram":{"size":"32768"}}],"BLAE":["Scrabble Blast!",{}],"BLAX":["Scrabble Scramble!",{}],"BLAP":["Scrabble Scramble!",{}],"V49J":["Screw Breaker - Goushin DoriRureRo",{"sram":{"size":"32768"}}],"BHVP":["Scurge - Hive",{"eeprom":{"size":"512"}}],"BHVE":["Scurge - Hive",{"eeprom":{"size":"512"}}],"ALJE":["Sea Trader - Rise of Taipan",{"eeprom":{"size":"8192"}}],"AAHE":["Secret Agent Barbie - Royal Jewels Mission",{}],"AAHP":["Secret Agent Barbie - Royal Jewels Mission",{}],"AYPE":["Sega Arcade Gallery",{}],"AYPP":["Sega Arcade Gallery",{}],"AYLJ":["Sega Rally Championship",{"sram":{"size":"32768"}}],"AYLP":["Sega Rally Championship",{"sram":{"size":"32768"}}],"AYLE":["Sega Rally Championship",{"sram":{"size":"32768"}}],"A3PE":["Sega Smash Pack",{}],"A3PP":["Sega Smash Pack",{}],"A7GJ":["Sengoku Kakumei Gaiden",{"sram":{"size":"32768"}}],"BKAJ":["Sennen Kazoku",{"flash":{"size":"131072"},"hasRTC":true}],"BSYJ":["Sentouin Yamada Hajime",{"sram":{"size":"32768"}}],"AENP":["Serious Sam Advance",{}],"AENE":["Serious Sam Advance",{}],"BHLE":["Shaman King - Legacy of the Spirits - Soaring Hawk",{"sram":{"size":"32768"}}],"BWSE":["Shaman King - Legacy of the Spirits - Sprinting Wolf",{"sram":{"size":"32768"}}],"BSOE":["Shaman King - Master of Spirits",{"sram":{"size":"32768"}}],"BSOP":["Shaman King - Master of Spirits",{"sram":{"size":"32768"}}],"B2MP":["Shaman King - Master of Spirits 2",{"sram":{"size":"32768"}}],"B2ME":["Shaman King - Master of Spirits 2",{"sram":{"size":"32768"}}],"AKAJ":["Shaman King Card Game - Chou Senjiryakketsu 2",{"sram":{"size":"32768"}}],"AL3J":["Shaman King Card Game - Chou Senjiryakketsu 3",{"sram":{"size":"32768"}}],"BBAE":["Shamu's Deep Sea Adventures",{"eeprom":{"size":"512"}}],"BBAP":["Shamu's Deep Sea Adventures",{"eeprom":{"size":"512"}}],"ASVJ":["Shanghai Advance",{"eeprom":{"size":"512"}}],"BSUX":["Shark Tale",{"eeprom":{"size":"512"}}],"BSUE":["Shark Tale",{"eeprom":{"size":"512"}}],"B9TJ":["Shark Tale",{"eeprom":{"size":"512"}}],"BSUI":["Shark Tale",{"eeprom":{"size":"512"}}],"ASCE":["Shaun Palmer's Pro Snowboarder",{}],"ASCD":["Shaun Palmer's Pro Snowboarder",{}],"AEPP":["Sheep",{"eeprom":{"size":"8192"}}],"B4KJ":["Shikakui Atama o Maruku Suru. Advance - Kanji, Keisan",{"eeprom":{"size":"8192"}}],"B4RJ":["Shikakui Atama o Maruku Suru. Advance - Kokugo, Sansuu, Shakai, Rika",{"eeprom":{"size":"8192"}}],"A64J":["Shimura Ken no Baka Tonosama - Bakushou Tenka Touitsu Game",{"eeprom":{"size":"8192"}}],"U33J":["Shin Bokura no Taiyou - Gyakushuu no Sabata",{"eeprom":{"size":"8192"},"hasRTC":true}],"AAJJ":["Shin Kisekae Monogatari",{"sram":{"size":"32768"}}],"AAUJ":["Shin Megami Tensei",{"sram":{"size":"32768"}}],"AL4J":["Shin Megami Tensei Devil Children - Hikari no Sho",{"sram":{"size":"32768"}}],"BDHJ":["Shin Megami Tensei Devil Children - Honoo no Sho",{"sram":{"size":"32768"}}],"BDYJ":["Shin Megami Tensei Devil Children - Koori no Sho",{"sram":{"size":"32768"}}],"BDLJ":["Shin Megami Tensei Devil Children - Messiah Riser",{"sram":{"size":"32768"}}],"A8ZJ":["Shin Megami Tensei Devil Children - Puzzle de Call!",{"eeprom":{"size":"8192"}}],"AC5J":["Shin Megami Tensei Devil Children - Yami no Sho",{"sram":{"size":"32768"}}],"A5TJ":["Shin Megami Tensei II",{"sram":{"size":"32768"}}],"ARAJ":["Shin Nihon Pro Wrestling - Toukon Retsuden Advance",{"sram":{"size":"32768"}}],"B36J":["Shin Sangoku Musou Advance",{"sram":{"size":"32768"}}],"BKCS":["Shin chan - Aventuras en Cineland",{"eeprom":{"size":"8192"}}],"BC2S":["Shin chan contra los Munecos de Shock Gahn",{"eeprom":{"size":"8192"}}],"BKVJ":["Shingata Medarot - Kabuto Version",{"eeprom":{"size":"8192"}}],"BKUJ":["Shingata Medarot - Kuwagata Version",{"eeprom":{"size":"8192"}}],"AF5J":["Shining Force - Kuroki Ryuu no Fukkatsu",{"sram":{"size":"32768"}}],"AF5E":["Shining Force - Resurrection of the Dark Dragon",{"sram":{"size":"32768"}}],"AF5P":["Shining Force - Resurrection of the Dark Dragon",{"sram":{"size":"32768"}}],"AHUP":["Shining Soul",{"flash":{"size":"65536"}}],"AHUJ":["Shining Soul",{"flash":{"size":"65536"}}],"AHUE":["Shining Soul",{"flash":{"size":"65536"}}],"AU2P":["Shining Soul II",{"flash":{"size":"65536"}}],"AU2J":["Shining Soul II",{"flash":{"size":"65536"}}],"AU2E":["Shining Soul II",{"flash":{"size":"65536"}}],"AVSJ":["Shinyaku Seiken Densetsu",{"flash":{"size":"65536"}}],"ANVJ":["Shiren Monsters Netsal",{"sram":{"size":"32768"}}],"AH4P":["Shrek - Hassle at the Castle",{"eeprom":{"size":"512"}}],"AH4E":["Shrek - Hassle at the Castle",{"eeprom":{"size":"512"}}],"AOIP":["Shrek - Reekin' Havoc",{"eeprom":{"size":"512"}}],"AOIE":["Shrek - Reekin' Havoc",{"eeprom":{"size":"512"}}],"B4IP":["Shrek - Smash n' Crash Racing",{"eeprom":{"size":"512"}}],"B4IE":["Shrek - Smash n' Crash Racing",{"eeprom":{"size":"512"}}],"B4UP":["Shrek - Super Slam",{"eeprom":{"size":"512"}}],"B4UE":["Shrek - Super Slam",{"eeprom":{"size":"512"}}],"AS4E":["Shrek - Swamp Kart Speedway",{"eeprom":{"size":"512"}}],"BSEE":["Shrek 2",{"eeprom":{"size":"512"}}],"BSEX":["Shrek 2",{"eeprom":{"size":"512"}}],"BSIX":["Shrek 2 - Beg for Mercy",{"eeprom":{"size":"512"}}],"BSIE":["Shrek 2 - Beg for Mercy",{"eeprom":{"size":"512"}}],"B3HP":["Shrek the Third",{"eeprom":{"size":"512"}}],"B3HE":["Shrek the Third",{"eeprom":{"size":"512"}}],"B3GE":["Sigma Star Saga",{"eeprom":{"size":"512"}}],"AIPE":["Silent Scope",{"eeprom":{"size":"512"}}],"AIPJ":["Silent Scope",{"eeprom":{"size":"512"}}],"AIPP":["Silent Scope",{"eeprom":{"size":"512"}}],"A7IJ":["Silk to Cotton",{"sram":{"size":"32768"}}],"A5CP":["SimCity 2000",{"eeprom":{"size":"8192"}}],"A5CE":["SimCity 2000",{"eeprom":{"size":"8192"}}],"AZKJ":["Simple 2960 Tomodachi Series Vol. 1 - The Table Game Collection",{"eeprom":{"size":"512"}}],"AZ9J":["Simple 2960 Tomodachi Series Vol. 2 - The Block Kuzushi",{"eeprom":{"size":"512"}}],"BS3J":["Simple 2960 Tomodachi Series Vol. 3 - The Itsudemo Puzzle - Massugu Soroeru Straws",{"eeprom":{"size":"512"}}],"BS4J":["Simple 2960 Tomodachi Series Vol. 4 - The Trump - Minna de Asoberu 12 Shurui no Trump Game",{"eeprom":{"size":"512"}}],"A4AE":["The Simpsons - Road Rage",{}],"A4AX":["The Simpsons - Road Rage",{}],"B46E":["The Sims 2",{"flash":{"size":"65536"}}],"B4OE":["The Sims 2 - Pets",{"flash":{"size":"65536"}}],"B4OX":["The Sims 2 - Pets",{"flash":{"size":"65536"}}],"B4PJ":["The Sims",{"eeprom":{"size":"8192"}}],"ASIE":["The Sims - Bustin' Out",{"eeprom":{"size":"8192"}}],"A4PJ":["Sister Princess - RePure",{"eeprom":{"size":"512"}}],"BSDP":["Sitting Ducks",{}],"BSDE":["Sitting Ducks",{}],"B4DP":["Sky Dancers - They Magically Fly!",{}],"B4DE":["Sky Dancers - They Magically Fly!",{}],"A9KJ":["Slime Morimori Dragon Quest - Shougeki no Shippo Dan",{"eeprom":{"size":"512"}}],"ATBJ":["Slot! Pro 2 Advance - GoGo Juggler & New Tairyou",{"eeprom":{"size":"8192"}}],"ASFJ":["Slot! Pro Advance - Takarabune & Ooedo Sakurafubuki 2",{"eeprom":{"size":"8192"}}],"BSVP":["Smashing Drive",{}],"BSVE":["Smashing Drive",{}],"ASGP":["Smuggler's Run",{}],"ASGE":["Smuggler's Run",{}],"A7SP":["The Smurfs - The Revenge of the Smurfs",{}],"AEAJ":["Snap Kid's",{"sram":{"size":"32768"}}],"ASQE":["Snood",{}],"ASQP":["Snood",{}],"B2VE":["Snood 2 - On Vacation",{}],"B2VP":["Snood 2 - On Vacation",{}],"AK6E":["Soccer Kid",{}],"ASOJ":["Sonic Advance",{"flash":{"size":"65536"}}],"ASOE":["Sonic Advance",{"flash":{"size":"65536"}}],"ASOP":["Sonic Advance",{"flash":{"size":"65536"}}],"A2NE":["Sonic Advance 2",{"flash":{"size":"65536"}}],"A2NP":["Sonic Advance 2",{"flash":{"size":"65536"}}],"A2NJ":["Sonic Advance 2",{"flash":{"size":"65536"}}],"B3SJ":["Sonic Advance 3",{"flash":{"size":"65536"}}],"B3SE":["Sonic Advance 3",{"flash":{"size":"65536"}}],"B3SP":["Sonic Advance 3",{"flash":{"size":"65536"}}],"BSBJ":["Sonic Battle",{"flash":{"size":"65536"}}],"BSBP":["Sonic Battle",{"flash":{"size":"65536"}}],"BSBE":["Sonic Battle",{"flash":{"size":"65536"}}],"A86J":["Sonic Pinball Party",{"flash":{"size":"65536"}}],"A3VP":["Sonic Pinball Party",{"flash":{"size":"65536"}}],"A3VE":["Sonic Pinball Party",{"flash":{"size":"65536"}}],"BIJE":["Sonic The Hedgehog - Genesis",{"eeprom":{"size":"512"}}],"A3QP":["Sound of Thunder, A",{}],"A3QE":["Sound of Thunder, A",{}],"A5UP":["Space Channel 5 - Ulala's Cosmic Attack",{"eeprom":{"size":"512"}}],"A5UE":["Space Channel 5 - Ulala's Cosmic Attack",{"eeprom":{"size":"512"}}],"AJSJ":["Space Hexcite - Maetel Legend EX",{"sram":{"size":"32768"}}],"AIDE":["Space Invaders",{"eeprom":{"size":"512"}}],"AIDF":["Space Invaders",{"eeprom":{"size":"512"}}],"AIDJ":["Space Invaders EX",{"eeprom":{"size":"512"}}],"AS6P":["Speedball 2 - Brutal Deluxe",{"eeprom":{"size":"512"}}],"AKXF":["Spider-Man",{"eeprom":{"size":"512"}}],"AKXD":["Spider-Man",{"eeprom":{"size":"512"}}],"AKXE":["Spider-Man",{"eeprom":{"size":"512"}}],"BC9E":["Spider-Man - Battle for New York",{"eeprom":{"size":"512"}}],"BC9P":["Spider-Man - Battle for New York",{"eeprom":{"size":"512"}}],"ASEJ":["Spider-Man - Mysterio no Kyoui",{"eeprom":{"size":"512"}}],"ASEE":["Spider-Man - Mysterio's Menace",{}],"BSPE":["Spider-Man 2",{"eeprom":{"size":"512"}}],"BSPI":["Spider-Man 2",{"eeprom":{"size":"512"}}],"BSPX":["Spider-Man 2",{"eeprom":{"size":"512"}}],"BI3E":["Spider-Man 3",{"eeprom":{"size":"512"}}],"BI3F":["Spider-Man 3",{"eeprom":{"size":"512"}}],"BI3P":["Spider-Man 3",{"eeprom":{"size":"512"}}],"BI3I":["Spider-Man 3",{"eeprom":{"size":"512"}}],"BI3D":["Spider-Man 3",{"eeprom":{"size":"512"}}],"BI3S":["Spider-Man 3",{"eeprom":{"size":"512"}}],"AC6D":["Spirit - Der Wilde Mustang - Auf der Suche nach Homeland",{}],"AC6F":["Spirit - L'Etalon des Plaines - A la Recherche de la Terre Natale",{}],"AC6P":["Spirit - Stallion of the Cimarron - Search for Homeland",{}],"AC6E":["Spirit - Stallion of the Cimarron - Search for Homeland",{}],"AWNE":["Spirits & Spells",{}],"BSQP":["SpongeBob SquarePants - Battle for Bikini Bottom",{}],"BSQE":["SpongeBob SquarePants - Battle for Bikini Bottom",{}],"BQ4E":["SpongeBob SquarePants - Creature from the Krusty Krab",{"eeprom":{"size":"512"}}],"BQ4P":["SpongeBob SquarePants - Creature from the Krusty Krab",{"eeprom":{"size":"512"}}],"BQQE":["SpongeBob SquarePants - Lights, Camera, Pants!",{"eeprom":{"size":"512"}}],"BQQX":["SpongeBob SquarePants - Lights, Camera, Pants!",{"eeprom":{"size":"512"}}],"AQ3E":["SpongeBob SquarePants - Revenge of the Flying Dutchman",{}],"ASPE":["SpongeBob SquarePants - SuperSponge",{}],"BSNX":["The SpongeBob SquarePants Movie",{}],"BSNE":["The SpongeBob SquarePants Movie",{}],"BNVP":["SpongeBob SquarePants and Friends - Battle for Volcano Island",{"eeprom":{"size":"512"}}],"BNUP":["SpongeBob SquarePants and Friends Unite!",{}],"BCCX":["SpongeBob SquarePants and Friends in Freeze Frame Frenzy",{"eeprom":{"size":"512"}}],"BUJX":["SpongeBob and Friends - Attack of the Toybots",{}],"BZXE":["SpongeBob's Atlantis SquarePantis",{}],"AKBE":["Sports Illustrated for Kids - Baseball",{"sram":{"size":"32768"}}],"AKFE":["Sports Illustrated for Kids - Football",{"sram":{"size":"32768"}}],"B23E":["Sportsman's Pack",{"eeprom":{"size":"512"}}],"AHNE":["Spy Hunter",{"eeprom":{"size":"512"}}],"AHNP":["Spy Hunter",{"eeprom":{"size":"512"}}],"AV3E":["Spy Kids 3-D - Game Over",{"eeprom":{"size":"512"}}],"AV3P":["Spy Kids 3-D - Game Over",{"eeprom":{"size":"512"}}],"A2KE":["Spy Kids Challenger",{"eeprom":{"size":"512"}}],"BSSE":["Spy Muppets - License to Croak",{}],"AOWE":["Spyro - Attack of the Rhynocs",{"eeprom":{"size":"8192"}}],"ASYP":["Spyro - Season of Ice",{"eeprom":{"size":"512"}}],"ASYE":["Spyro - Season of Ice",{"eeprom":{"size":"512"}}],"A2SP":["Spyro 2 - Season of Flame",{"eeprom":{"size":"8192"}}],"A2SE":["Spyro 2 - Season of Flame",{"eeprom":{"size":"8192"}}],"A4SJ":["Spyro Advance",{"eeprom":{"size":"512"}}],"BS8J":["Spyro Advance - Wakuwaku Tomodachi Daisakusen!",{"eeprom":{"size":"512"}}],"AOWP":["Spyro Adventure",{"eeprom":{"size":"8192"}}],"BSTP":["Spyro Fusion",{"eeprom":{"size":"512"}}],"BSTE":["Spyro Orange - The Cortex Conspiracy",{"eeprom":{"size":"512"}}],"B8SE":["Spyro Superpack",{"eeprom":{"size":"8192"}}],"A9GP":["Stadium Games",{}],"A9GE":["Stadium Games",{}],"AS2E":["Star Wars - Episode II - Attack of the Clones",{}],"AS2X":["Star Wars - Episode II - Attack of the Clones",{}],"BE3P":["Star Wars - Episode III - Revenge of the Sith",{"eeprom":{"size":"512"}}],"BE3E":["Star Wars - Episode III - Revenge of the Sith",{"eeprom":{"size":"512"}}],"BSWE":["Star Wars - Flight of the Falcon",{}],"BSWP":["Star Wars - Flight of the Falcon",{}],"ASWX":["Star Wars - Jedi Power Battles",{}],"ASWE":["Star Wars - Jedi Power Battles",{}],"A2WE":["Star Wars - The New Droid Army",{}],"A2WP":["Star Wars - The New Droid Army",{}],"BCKP":["Star Wars Trilogy - Apprentice of the Force",{"eeprom":{"size":"512"}}],"BCKE":["Star Wars Trilogy - Apprentice of the Force",{"eeprom":{"size":"512"}}],"AS8P":["Star X",{}],"AS8E":["Star X",{}],"AYHE":["Starsky & Hutch",{"eeprom":{"size":"512"}}],"AYHP":["Starsky & Hutch",{"eeprom":{"size":"512"}}],"BKTP":["Steel Empire",{"eeprom":{"size":"512"}}],"ATUP":["Steven Gerrard's Total Soccer 2002",{"eeprom":{"size":"512"}}],"B35P":["Strawberry Shortcake - Ice Cream Island - Riding Camp",{"eeprom":{"size":"512"}}],"B35E":["Strawberry Shortcake - Summertime Adventure",{}],"BQWE":["Strawberry Shortcake - Summertime Adventure - Special Edition",{}],"B4TE":["Strawberry Shortcake - Sweet Dreams",{"eeprom":{"size":"512"}}],"AZUP":["Street Fighter Alpha 3",{"eeprom":{"size":"8192"}}],"AZUE":["Street Fighter Alpha 3",{"eeprom":{"size":"8192"}}],"AZUJ":["Street Fighter Zero 3 Upper",{"eeprom":{"size":"8192"}}],"A3ZE":["Street Jam Basketball",{"eeprom":{"size":"512"}}],"BCZP":["Street Racing Syndicate",{"eeprom":{"size":"512"}}],"BCZE":["Street Racing Syndicate",{"eeprom":{"size":"512"}}],"AFHE":["Strike Force Hydra",{}],"AFHP":["Strike Force Hydra",{}],"ASLE":["Stuart Little 2",{}],"ASLF":["Stuart Little 2",{}],"AUXE":["Stuntman",{"eeprom":{"size":"512"}}],"AUXP":["Stuntman",{"eeprom":{"size":"512"}}],"B4LJ":["Sugar Sugar Rune - Heart Ga Ippai! Moegi Gakuen",{"eeprom":{"size":"8192"}}],"BZCE":["The Suite Life of Zack & Cody - Tipton Caper",{"eeprom":{"size":"512"}}],"AA6P":["The Sum of All Fears",{"eeprom":{"size":"512"}}],"AA6E":["The Sum of All Fears",{"eeprom":{"size":"512"}}],"AB4J":["Summon Night - Craft Sword Monogatari",{"eeprom":{"size":"8192"}}],"B3CJ":["Summon Night - Craft Sword Monogatari - Hajimari no Ishi",{"eeprom":{"size":"8192"}}],"BSKJ":["Summon Night - Craft Sword Monogatari 2",{"eeprom":{"size":"8192"}}],"AB4E":["Summon Night - Swordcraft Story",{"eeprom":{"size":"8192"}}],"BSKE":["Summon Night - Swordcraft Story 2",{"eeprom":{"size":"8192"}}],"BG6E":["Super Army War",{}],"AABP":["Super Black Bass Advance",{"eeprom":{"size":"8192"}}],"AABJ":["Super Black Bass Advance",{"sram":{"size":"32768"}}],"AVZP":["Super Bubble Pop",{"eeprom":{"size":"512"}}],"AVZE":["Super Bubble Pop",{"eeprom":{"size":"512"}}],"ABMP":["Super Bust-A-Move",{}],"ABME":["Super Bust-A-Move",{}],"BSAJ":["Super Chinese 1, 2 Advance",{"eeprom":{"size":"512"}}],"BCLE":["Super Collapse! II",{}],"ADFE":["Super Dodge Ball Advance",{"sram":{"size":"32768"}}],"ADFP":["Super Dodge Ball Advance",{"sram":{"size":"32768"}}],"A5NJ":["Super Donkey Kong",{"eeprom":{"size":"512"}}],"B2DJ":["Super Donkey Kong 2",{"eeprom":{"size":"8192"}}],"BDQJ":["Super Donkey Kong 3",{"eeprom":{"size":"512"}}],"AZNE":["Super Dropzone - Intergalactic Rescue Mission",{}],"AZNP":["Super Dropzone - Intergalactic Rescue Mission",{}],"BDPE":["Super Duper Sumos",{"eeprom":{"size":"512"}}],"AG5E":["Super Ghouls'n Ghosts",{"eeprom":{"size":"512"}}],"BF8E":["Super Hornet FA 18F",{}],"AMAE":["Super Mario Advance",{"eeprom":{"size":"512"}}],"AMAJ":["Super Mario Advance - Super Mario USA + Mario Brothers",{"eeprom":{"size":"512"}}],"AA2E":["Super Mario Advance 2 - Super Mario World",{"eeprom":{"size":"8192"}}],"AA2P":["Super Mario Advance 2 - Super Mario World",{"eeprom":{"size":"8192"}}],"AA2J":["Super Mario Advance 2 - Super Mario World + Mario Brothers",{"eeprom":{"size":"8192"}}],"A3AE":["Super Mario Advance 3 - Yoshi's Island",{"eeprom":{"size":"8192"}}],"A3AP":["Super Mario Advance 3 - Yoshi's Island",{"eeprom":{"size":"8192"}}],"A3AJ":["Super Mario Advance 3 - Yoshi's Island + Mario Brothers",{"eeprom":{"size":"8192"}}],"AX4J":["Super Mario Advance 4 - Super Mario 3 + Mario Brothers",{"flash":{"size":"131072"}}],"AX4P":["Super Mario Advance 4 - Super Mario Bros. 3",{"flash":{"size":"131072"}}],"AX4E":["Super Mario Advance 4 - Super Mario Bros. 3",{"flash":{"size":"131072"}}],"BMVJ":["Super Mario Ball",{"eeprom":{"size":"512"}}],"BMVP":["Super Mario Ball",{"eeprom":{"size":"512"}}],"ALUP":["Super Monkey Ball Jr.",{"eeprom":{"size":"512"}}],"ALUE":["Super Monkey Ball Jr.",{"eeprom":{"size":"512"}}],"ABMJ":["Super Puzzle Bobble Advance",{}],"AZ8E":["Super Puzzle Fighter II Turbo",{"eeprom":{"size":"512"}}],"AZ8P":["Super Puzzle Fighter II Turbo",{"eeprom":{"size":"512"}}],"BDMJ":["Super Real Mahjong Dousoukai",{"eeprom":{"size":"512"}}],"AOGE":["Super Robot Taisen - Original Generation",{"flash":{"size":"65536"}}],"AOGP":["Super Robot Taisen - Original Generation",{"flash":{"size":"65536"}}],"AOGJ":["Super Robot Taisen - Original Generation",{"flash":{"size":"65536"}}],"B2RJ":["Super Robot Taisen - Original Generation 2",{"flash":{"size":"65536"}}],"B2RE":["Super Robot Taisen - Original Generation 2",{"flash":{"size":"65536"}}],"ASRJ":["Super Robot Taisen A",{"flash":{"size":"65536"}}],"A6SJ":["Super Robot Taisen D",{"flash":{"size":"65536"}}],"B6JJ":["Super Robot Taisen J",{"flash":{"size":"65536"}}],"AJ9J":["Super Robot Taisen R",{"flash":{"size":"65536"}}],"AXRE":["Super Street Fighter II Turbo - Revival",{"eeprom":{"size":"512"}}],"AXRP":["Super Street Fighter II Turbo - Revival",{"eeprom":{"size":"512"}}],"AXRJ":["Super Street Fighter II X - Revival",{"eeprom":{"size":"512"}}],"ASUP":["Superman - Countdown to Apokolips",{}],"ASUE":["Superman - Countdown to Apokolips",{}],"BQXE":["Superman Returns - Fortress of Solitude",{"eeprom":{"size":"512"}}],"BXUX":["Surf's Up",{"eeprom":{"size":"512"}}],"BXUE":["Surf's Up",{"eeprom":{"size":"512"}}],"BXUP":["Surf's Up",{"eeprom":{"size":"512"}}],"ASKJ":["Sutakomi - Star Communicator",{"sram":{"size":"32768"}}],"ABGJ":["Sweet Cookie Pie",{"eeprom":{"size":"8192"}}],"AVSX":["Sword of Mana",{"flash":{"size":"65536"}}],"AVSE":["Sword of Mana",{"flash":{"size":"65536"}}],"AVSP":["Sword of Mana",{"flash":{"size":"65536"}}],"AVSY":["Sword of Mana",{"flash":{"size":"65536"}}],"BSFJ":["Sylvanian Families - Fashion Designer ni Naritai! - Kurumi-risu no Onnanoko",{"eeprom":{"size":"8192"}}],"BS5J":["Sylvanian Families - Yousei no Stick to Fushigi no Ki - Marron-inu no Onnanoko",{"eeprom":{"size":"8192"}}],"A4LJ":["Sylvanian Families 4 - Meguru Kisetsu no Tapestry",{"eeprom":{"size":"8192"}}],"BTGP":["TG Rally",{"eeprom":{"size":"512"}}],"BEXE":["TMNT",{"eeprom":{"size":"512"}}],"BEXP":["TMNT - Teenage Mutant Ninja Turtles",{"eeprom":{"size":"512"}}],"ATQP":["TOCA World Touring Cars",{"eeprom":{"size":"512"}}],"ATOE":["Tactics Ogre - The Knight of Lodis",{"flash":{"size":"65536"}}],"ATOJ":["Tactics Ogre Gaiden - The Knight of Lodis",{"flash":{"size":"65536"}}],"BU6J":["Taiketsu! Ultra Hero",{"eeprom":{"size":"512"}}],"BJWE":["Tak - The Great Juju Challenge",{"eeprom":{"size":"512"}}],"BJWX":["Tak - The Great Juju Challenge",{"eeprom":{"size":"512"}}],"BT9E":["Tak 2 - The Staff of Dreams",{"eeprom":{"size":"512"}}],"BT9X":["Tak 2 - The Staff of Dreams",{"eeprom":{"size":"512"}}],"BJUP":["Tak and the Power of Juju",{"eeprom":{"size":"512"}}],"BJUX":["Tak and the Power of Juju",{"eeprom":{"size":"512"}}],"BJUE":["Tak and the Power of Juju",{"eeprom":{"size":"512"}}],"AN8E":["Tales of Phantasia",{"eeprom":{"size":"8192"}}],"AN8J":["Tales of Phantasia",{"eeprom":{"size":"8192"}}],"AN8P":["Tales of Phantasia",{"eeprom":{"size":"8192"}}],"AN9J":["Tales of the World - Narikiri Dungeon 2",{"eeprom":{"size":"8192"}}],"B3TJ":["Tales of the World - Narikiri Dungeon 3",{"eeprom":{"size":"8192"}}],"A9PJ":["Tales of the World - Summoner's Lineage",{"sram":{"size":"32768"}}],"AYMJ":["Tanbi Musou - Meine Liebe",{"sram":{"size":"32768"}}],"ATAP":["Tang Tang",{"eeprom":{"size":"512"}}],"ATAE":["Tang Tang",{"eeprom":{"size":"512"}}],"BTIJ":["Tantei Gakuen Q - Kyuukyoku Trick ni Idome!",{"sram":{"size":"32768"}}],"BTQJ":["Tantei Gakuen Q - Meitantei wa Kimi da!",{"sram":{"size":"32768"}}],"BT3J":["Tantei Jinguuji Saburou - Shiroi Kage no Shoujo",{"eeprom":{"size":"8192"}}],"AJGF":["Tarzan - L'Appel de la Jungle",{"eeprom":{"size":"512"}}],"AJGE":["Tarzan - Return to the Jungle",{"eeprom":{"size":"512"}}],"AJGD":["Tarzan - Rueckkehr in den Dschungel",{"eeprom":{"size":"512"}}],"AXQF":["Taxi 3",{}],"BBLE":["Teen Titans",{"eeprom":{"size":"512"}}],"BZUE":["Teen Titans 2",{"eeprom":{"size":"512"}}],"BNTP":["Teenage Mutant Ninja Turtles",{"eeprom":{"size":"512"}}],"BNTE":["Teenage Mutant Ninja Turtles",{"eeprom":{"size":"512"}}],"BT2P":["Teenage Mutant Ninja Turtles 2 - Battle Nexus",{"eeprom":{"size":"8192"}}],"BT2E":["Teenage Mutant Ninja Turtles 2 - Battle Nexus",{"eeprom":{"size":"8192"}}],"BT8E":["Teenage Mutant Ninja Turtles Double Pack",{"eeprom":{"size":"8192"}}],"BT8P":["Teenage Mutant Ninja Turtles Double Pack",{"eeprom":{"size":"8192"}}],"ATKJ":["Tekken Advance",{"eeprom":{"size":"512"}}],"ATKE":["Tekken Advance",{"eeprom":{"size":"512"}}],"ATKP":["Tekken Advance",{"eeprom":{"size":"512"}}],"BTPE":["Ten Pin Alley 2",{}],"AT8P":["Tennis Masters Series 2003",{"eeprom":{"size":"512"}}],"AVAJ":["Tennis no Ouji-sama - Aim at the Victory!",{"sram":{"size":"32768"}}],"ATIJ":["Tennis no Ouji-sama - Genius Boys Academy",{"flash":{"size":"65536"}}],"A9LJ":["Tennis no Ouji-sama 2003 - Cool Blue",{"sram":{"size":"32768"}}],"A8RJ":["Tennis no Ouji-sama 2003 - Passion Red",{"sram":{"size":"32768"}}],"B4GJ":["Tennis no Ouji-sama 2004 - Glorious Gold",{"sram":{"size":"32768"}}],"B4SJ":["Tennis no Ouji-sama 2004 - Stylish Silver",{"sram":{"size":"32768"}}],"AO3E":["Terminator 3 - Rise of the Machines",{}],"AO3P":["Terminator 3 - Rise of the Machines",{}],"ATWE":["Tetris Worlds",{}],"ATWJ":["Tetris Worlds",{}],"ATWY":["Tetris Worlds",{}],"ATWX":["Tetris Worlds",{}],"BXAE":["Texas Hold 'em Poker",{}],"BRVE":["That's So Raven",{"eeprom":{"size":"512"}}],"BZSE":["That's So Raven 2 - Supernatural Style",{"eeprom":{"size":"512"}}],"A3TE":["The Three Stooges",{}],"B65E":["Three-in-One Pack - Connect Four + Perfection + Trouble",{}],"B66E":["Three-in-One Pack - Risk + Battleship + Clue",{}],"B67E":["Three-in-One Pack - Sorry! + Aggravation + Scrabble Junior",{}],"BTHE":["Thunder Alley",{}],"BTBE":["Thunderbirds",{}],"ATNP":["Thunderbirds - International Rescue",{}],"BTWE":["Tiger Woods PGA Tour 2004",{"eeprom":{"size":"512"}}],"AT5E":["Tiger Woods PGA Tour Golf",{"eeprom":{"size":"512"}}],"AT5X":["Tiger Woods PGA Tour Golf",{"eeprom":{"size":"512"}}],"BNCE":["Tim Burton's The Nightmare Before Christmas - The Pumpkin King",{"eeprom":{"size":"512"}}],"BNCJ":["Tim Burton's The Nightmare Before Christmas - The Pumpkin King",{"eeprom":{"size":"512"}}],"ATTP":["Tiny Toon Adventures - Buster's Bad Dream",{}],"ATTE":["Tiny Toon Adventures - Scary Dreams",{}],"AWSE":["Tiny Toon Adventures - Wacky Stackers",{}],"AWSP":["Tiny Toon Adventures - Wacky Stackers",{}],"ATVP":["Tir et But - Edition Champions du Monde",{}],"BTCF":["Titeuf - Mega Compet",{}],"AT7F":["Titeuf - Ze Gagmachine",{}],"ATMF":["Titi et les Bijoux Magiques",{"sram":{"size":"32768"}}],"AF7J":["Tokimeki Yume Series 1 - Ohanaya-san ni Narou!",{"eeprom":{"size":"8192"}}],"BTFJ":["Tokyo Majin Gakuen - Fuju Houroku",{"sram":{"size":"32768"}}],"BTZE":["Tokyo Xtreme Racer Advance",{"eeprom":{"size":"512"}}],"BTZP":["Tokyo Xtreme Racer Advance",{"eeprom":{"size":"512"}}],"AR6P":["Tom Clancy's Rainbow Six - Rogue Spear",{"eeprom":{"size":"512"}}],"AR6E":["Tom Clancy's Rainbow Six - Rogue Spear",{"eeprom":{"size":"512"}}],"AO4E":["Tom Clancy's Splinter Cell",{"eeprom":{"size":"512"}}],"AO4P":["Tom Clancy's Splinter Cell",{"eeprom":{"size":"512"}}],"BSLE":["Tom Clancy's Splinter Cell - Pandora Tomorrow",{"eeprom":{"size":"512"}}],"BSLP":["Tom Clancy's Splinter Cell - Pandora Tomorrow",{"eeprom":{"size":"512"}}],"ATJE":["Tom and Jerry - The Magic Ring",{}],"ATJP":["Tom and Jerry - The Magic Ring",{}],"BJTP":["Tom and Jerry Tales",{}],"BJTE":["Tom and Jerry Tales",{}],"AIFE":["Tom and Jerry in Infurnal Escape",{}],"AIFP":["Tom and Jerry in Infurnal Escape",{}],"AGLJ":["Tomato Adventure",{"eeprom":{"size":"8192"}}],"BT7E":["Tonka - On the Job",{}],"BH9E":["Tony Hawk's American Sk8land",{"eeprom":{"size":"8192"}}],"BH9P":["Tony Hawk's American Sk8land",{"eeprom":{"size":"8192"}}],"BH9X":["Tony Hawk's American Sk8land",{"eeprom":{"size":"8192"}}],"BXSE":["Tony Hawk's Downhill Jam",{"eeprom":{"size":"512"}}],"BXSP":["Tony Hawk's Downhill Jam",{"eeprom":{"size":"512"}}],"ATHE":["Tony Hawk's Pro Skater 2",{"eeprom":{"size":"512"}}],"ATHF":["Tony Hawk's Pro Skater 2",{"eeprom":{"size":"512"}}],"ATHD":["Tony Hawk's Pro Skater 2",{"eeprom":{"size":"512"}}],"AT3F":["Tony Hawk's Pro Skater 3",{"eeprom":{"size":"8192"}}],"AT3E":["Tony Hawk's Pro Skater 3",{"eeprom":{"size":"8192"}}],"AT3D":["Tony Hawk's Pro Skater 3",{"eeprom":{"size":"8192"}}],"AT6E":["Tony Hawk's Pro Skater 4",{"eeprom":{"size":"8192"}}],"BTOE":["Tony Hawk's Underground",{"eeprom":{"size":"8192"}}],"B2TE":["Tony Hawk's Underground 2",{"eeprom":{"size":"8192"}}],"AT7P":["Tootuff - The Gagmachine",{}],"ATCE":["Top Gear GT Championship",{"eeprom":{"size":"512"}}],"ATCP":["Top Gear GT Championship",{"eeprom":{"size":"512"}}],"BTGX":["Top Gear Rally",{"eeprom":{"size":"512"}}],"AYEJ":["Top Gear Rally",{"eeprom":{"size":"512"}}],"BTGE":["Top Gear Rally",{"eeprom":{"size":"512"}}],"A2YE":["Top Gun - Combat Zones",{}],"ATGE":["Top Gun - Firestorm Advance",{}],"B27P":["Top Spin 2",{"eeprom":{"size":"512"}}],"B27E":["Top Spin 2",{"eeprom":{"size":"512"}}],"ATUJ":["Total Soccer Advance",{"eeprom":{"size":"512"}}],"BTUP":["Totally Spies!",{"eeprom":{"size":"512"}}],"BTUE":["Totally Spies!",{"eeprom":{"size":"512"}}],"B2LP":["Totally Spies! 2 - Undercover",{"eeprom":{"size":"512"}}],"B2LE":["Totally Spies! 2 - Undercover",{"eeprom":{"size":"512"}}],"AH3J":["Tottoko Hamutarou 3 - Love Love Daibouken Dechu",{"sram":{"size":"32768"}}],"A84J":["Tottoko Hamutarou 4 - Nijiiro Daikoushin Dechu",{"sram":{"size":"32768"}}],"BZWJ":["Touhai Densetsu Akagi - Yami ni Mai Orita Tensai",{"eeprom":{"size":"8192"}}],"A59J":["Toukon Heat",{"eeprom":{"size":"8192"}}],"BTRE":["The Tower SP",{"flash":{"size":"65536"}}],"BTRJ":["The Tower SP",{"flash":{"size":"65536"}}],"ATRJ":["Toyrobo Force",{"sram":{"size":"32768"}}],"AZQE":["Treasure Planet",{}],"AZQP":["Treasure Planet",{}],"B9SP":["Trick Star",{"eeprom":{"size":"512"}}],"BTJE":["Tringo",{"eeprom":{"size":"512"}}],"BTJP":["Tringo",{"eeprom":{"size":"512"}}],"BT6X":["Trollz - Hair Affair!",{"eeprom":{"size":"512"}}],"BT6P":["Trollz - Hair Affair!",{"eeprom":{"size":"512"}}],"BT6E":["Trollz - Hair Affair!",{"eeprom":{"size":"512"}}],"BT6Y":["Trollz - Hair Affair!",{"eeprom":{"size":"512"}}],"BTNE":["Tron 2.0 - Killer App",{"eeprom":{"size":"512"}}],"BTNP":["Tron 2.0 - Killer App",{"eeprom":{"size":"512"}}],"BIIJ":["Tsuukin Hitofude",{"flash":{"size":"65536"}}],"AK3E":["Turbo Turtle Adventure",{"eeprom":{"size":"512"}}],"AT4E":["Turok Evolution",{}],"AT4P":["Turok Evolution",{}],"ATMP":["Tweety and the Magic Gems",{"sram":{"size":"32768"}}],"ATME":["Tweety and the Magic Gems",{"sram":{"size":"32768"}}],"ATMD":["Tweety and the Magic Gems",{"sram":{"size":"32768"}}],"AMJJ":["Tweety no Hearty Party",{"sram":{"size":"32768"}}],"BFVJ":["Twin Series 1 - Mezase Debut! - Fashion Designer Monogatari + Kawaii Pet Game Gallery 2",{"eeprom":{"size":"512"}}],"BOPJ":["Twin Series 2 - Oshare Princess 4 + Renai Uranai Daisakusen! + Renai Party Game - Sweet Heart",{"eeprom":{"size":"512"}}],"BQMJ":["Twin Series 3 - Konchuu Monster - Ouja Ketteisen + Super Chinese Labyrinth",{"eeprom":{"size":"512"}}],"BHFJ":["Twin Series 4 - Hamu Hamu Monster EX - Hamster Monogatari RPG + Fantasy Puzzle - Hamster Monogatari - Mahou no Meikyuu 1.2.3",{"eeprom":{"size":"8192"}}],"BMWJ":["Twin Series 5 - Mahou no Kuni no Cake-ya-san Monogatari + Wanwan Meitantei EX",{"eeprom":{"size":"8192"}}],"BWNJ":["Twin Series 6 - Wannyan Idol Gakuen + Koinu to Issho Special",{"eeprom":{"size":"512"}}],"B2PJ":["Twin Series 7 - Twin Puzzle - Kisekae Wanko EX + Nyaa to Chuu no Rainbow Magic 2",{"eeprom":{"size":"512"}}],"BTYE":["Ty the Tasmanian Tiger 2 - Bush Rescue",{"eeprom":{"size":"8192"}}],"BTVE":["Ty the Tasmanian Tiger 3 - Night of the Quinkan",{"eeprom":{"size":"8192"}}],"AUCJ":["Uchuu Daisakusen Choco Vader - Uchuu kara no Shinryakusha",{"eeprom":{"size":"8192"}}],"BUVJ":["Uchuu no Stellvia",{"sram":{"size":"32768"}}],"BUHJ":["Ueki no Housoku - Jingi Sakuretsu! Nouryokusha Battle",{"eeprom":{"size":"512"}}],"AEWJ":["Ui-Ire - World Soccer Winning Eleven",{"eeprom":{"size":"8192"}}],"BUZE":["Ultimate Arcade Games",{"eeprom":{"size":"8192"}}],"AVEE":["Ultimate Beach Soccer",{"eeprom":{"size":"512"}}],"ABUE":["Ultimate Brain Games",{"eeprom":{"size":"512"}}],"BUCE":["Ultimate Card Games",{"eeprom":{"size":"8192"}}],"AK2E":["Ultimate Muscle - The Kinnikuman Legacy - The Path of the Superhero",{"eeprom":{"size":"512"}}],"BUAE":["Ultimate Puzzle Games",{"eeprom":{"size":"512"}}],"BULP":["Ultimate Spider-Man",{"eeprom":{"size":"512"}}],"BULE":["Ultimate Spider-Man",{"eeprom":{"size":"512"}}],"BULX":["Ultimate Spider-Man",{"eeprom":{"size":"512"}}],"BUWE":["Ultimate Winter Games",{}],"BUTJ":["Ultra Keibitai - Monster Attack",{"flash":{"size":"65536"}}],"BU4E":["Unfabulous",{}],"BICD":["Die Unglaublichen",{}],"BU5E":["Uno 52",{}],"BU5P":["Uno 52",{}],"BUIP":["Uno Free Fall",{}],"BUIE":["Uno Free Fall",{}],"AYIE":["Urban Yeti!",{}],"BOCJ":["The Urbz - Sims in the City",{"flash":{"size":"65536"}}],"BOCE":["The Urbz - Sims in the City",{"flash":{"size":"65536"}}],"AVMJ":["V-Master Cross",{"eeprom":{"size":"512"}}],"AVRP":["V-Rally 3",{"eeprom":{"size":"512"}}],"AVRJ":["V-Rally 3",{"eeprom":{"size":"512"}}],"AVRE":["V-Rally 3",{"eeprom":{"size":"512"}}],"AVPP":["V.I.P.",{}],"BANE":["Van Helsing",{}],"BANP":["Van Helsing",{}],"BRXJ":["Vattroller X",{"sram":{"size":"32768"}}],"BH5S":["Vecinos Invasores",{"eeprom":{"size":"512"}}],"BZTE":["VeggieTales - LarryBoy and the Bad Apple",{"eeprom":{"size":"512"}}],"AVTP":["Virtua Tennis",{"eeprom":{"size":"512"}}],"AVTE":["Virtua Tennis",{"eeprom":{"size":"512"}}],"AVKP":["Virtual Kasparov",{"eeprom":{"size":"512"}}],"AVKE":["Virtual Kasparov",{"eeprom":{"size":"512"}}],"BWTP":["W.i.t.c.h.",{"eeprom":{"size":"512"}}],"ATEE":["WTA Tour Tennis",{"eeprom":{"size":"512"}}],"ACIJ":["WTA Tour Tennis Pocket",{"eeprom":{"size":"512"}}],"AW8E":["WWE - Road to WrestleMania X8",{"eeprom":{"size":"512"}}],"BWWE":["WWE - Survivor Series",{"eeprom":{"size":"512"}}],"AWFE":["WWF - Road to WrestleMania",{}],"BSRE":["Wade Hixton's Counter Punch",{"eeprom":{"size":"512"}}],"BMYJ":["Wagamama Fairy Mirumo de Pon! - 8 Nin no Toki no Yousei",{"sram":{"size":"32768"}}],"BMIJ":["Wagamama Fairy Mirumo de Pon! - Dokidoki Memorial Panic",{"sram":{"size":"32768"}}],"BWPJ":["Wagamama Fairy Mirumo de Pon! - Nazo no Kagi to Shinjitsu no Tobira",{"sram":{"size":"32768"}}],"AWKJ":["Wagamama Fairy Mirumo de Pon! - Ougon Maracas no Densetsu",{"eeprom":{"size":"8192"}}],"BMPJ":["Wagamama Fairy Mirumo de Pon! - Taisen Mahoudama",{"sram":{"size":"32768"}}],"BWFJ":["Wagamama Fairy Mirumo de Pon! - Yume no Kakera",{"sram":{"size":"32768"}}],"AWDE":["Wakeboarding Unleashed featuring Shaun Murray",{"eeprom":{"size":"512"}}],"AWAC":["Waliou Xunbao Ji",{"sram":{"size":"32768"}}],"AZWC":["Waliou Zhizao",{"sram":{"size":"32768"}}],"BWXJ":["Wanko Mix Chiwanko World",{"eeprom":{"size":"8192"}}],"BWKJ":["Wanko de Kururin! Wancle",{"eeprom":{"size":"512"}}],"BWDJ":["Wannyan Doubutsu Byouin - Doubutsu no Oishasan Ikusei Game",{"eeprom":{"size":"8192"}}],"BWMJ":["Wanwan Meitantei",{"eeprom":{"size":"512"}}],"AWAE":["Wario Land 4",{"sram":{"size":"32768"}}],"AWAJ":["Wario Land Advance",{"sram":{"size":"32768"}}],"RZWE":["WarioWare - Twisted!",{"sram":{"size":"32768"}}],"AZWE":["WarioWare, Inc. - Mega Microgame$!",{"sram":{"size":"32768"}}],"AZWP":["WarioWare, Inc. - Minigame Mania",{"sram":{"size":"32768"}}],"A55H":["Weekend Miljonairs",{}],"A55D":["Wer Wird Millionaer",{}],"BWEE":["Whac-A-Mole",{"eeprom":{"size":"512"}}],"A73J":["Whistle! - Dai-37-kai Tokyo-to Chuugakkou Sougou Taiiku Soccer Taikai",{"sram":{"size":"32768"}}],"A55P":["Who Wants to Be a Millionaire",{}],"A55U":["Who Wants to Be a Millionaire",{}],"B55P":["Who Wants to Be a Millionaire - 2nd Edition",{}],"BWJP":["Who Wants to Be a Millionaire Junior",{}],"AWLE":["The Wild Thornberrys Movie",{}],"AWTE":["The Wild Thornberrys - Chimp Chase",{}],"BWLE":["The Wild",{"eeprom":{"size":"512"}}],"BWUD":["Die Wilden Fussball-Kerle - Entscheidung im Teufelstopf",{}],"BXWD":["Die Wilden Fussball-Kerle - Gefahr im Wilde Kerle Land",{"eeprom":{"size":"512"}}],"BWIE":["WinX Club",{"eeprom":{"size":"8192"}}],"BWIP":["WinX Club",{"eeprom":{"size":"8192"}}],"BWVE":["WinX Club - Quest for the Codex",{"eeprom":{"size":"512"}}],"BWVP":["WinX Club - Quest for the Codex",{"eeprom":{"size":"512"}}],"AW9E":["Wing Commander - Prophecy",{"eeprom":{"size":"512"}}],"AW9P":["Wing Commander - Prophecy",{"eeprom":{"size":"512"}}],"AWQP":["Wings",{"eeprom":{"size":"512"}}],"AWQE":["Wings",{"eeprom":{"size":"512"}}],"BWHP":["Winnie the Pooh's Rumbly Tumbly Adventure",{}],"BWHE":["Winnie the Pooh's Rumbly Tumbly Adventure",{}],"BWZP":["Winnie the Pooh's Rumbly Tumbly Adventure & Rayman 3",{"eeprom":{"size":"512"}}],"AWPJ":["Winning Post for Game Boy Advance",{"flash":{"size":"65536"}}],"BWYP":["Winter Sports",{"eeprom":{"size":"512"}}],"AWZJ":["Wizardry Summoner",{"sram":{"size":"32768"}}],"AWOE":["Wolfenstein 3D",{"eeprom":{"size":"512"}}],"AWWJ":["Woody Woodpecker - Crazy Castle 5",{"eeprom":{"size":"512"}}],"AWWP":["Woody Woodpecker in Crazy Castle 5",{"eeprom":{"size":"512"}}],"AWWE":["Woody Woodpecker in Crazy Castle 5",{"eeprom":{"size":"512"}}],"BB8E":["Word Safari - The Friendship Totems",{"eeprom":{"size":"512"}}],"AASJ":["World Advance Soccer - Shouri e no Michi",{"eeprom":{"size":"8192"}}],"BP9P":["World Championship Poker",{}],"BP9E":["World Championship Poker",{}],"B26E":["World Poker Tour",{"eeprom":{"size":"8192"}}],"BWOP":["World Poker Tour",{"eeprom":{"size":"8192"}}],"AWCE":["World Tennis Stars",{}],"AWCP":["World Tennis Stars",{}],"AWBP":["Worms Blast",{}],"AWYP":["Worms World Party",{}],"AWYE":["Worms World Party",{}],"AXIE":["X-Bladez - Inline Skater",{}],"AXIP":["X-Bladez - Inline Skater",{}],"AXME":["X-Men - Reign of Apocalypse",{"eeprom":{"size":"512"}}],"B3XP":["X-Men - The Official Game",{"eeprom":{"size":"512"}}],"B3XE":["X-Men - The Official Game",{"eeprom":{"size":"512"}}],"AWVF":["X-Men 2 - La Vengeance de Wolverine",{"eeprom":{"size":"512"}}],"AWVE":["X2 - Wolverine's Revenge",{"eeprom":{"size":"512"}}],"BXME":["XS Moto",{}],"A3AC":["Yaoxi Dao",{"eeprom":{"size":"8192"}}],"BYUJ":["Yggdra Union",{"eeprom":{"size":"8192"}}],"BYUP":["Yggdra Union - We'll Never Fight Alone",{"eeprom":{"size":"8192"}}],"BYUE":["Yggdra Union - We'll Never Fight Alone",{"eeprom":{"size":"8192"}}],"KYGE":["Yoshi - Topsy-Turvy",{"eeprom":{"size":"512"}}],"KYGJ":["Yoshi no Banyuuinryoku",{"eeprom":{"size":"512"},"hasMotionSensor":true}],"KYGP":["Yoshi's Universal Gravitation",{"eeprom":{"size":"512"},"hasMotionSensor":true}],"AFUJ":["Youkaidou",{"eeprom":{"size":"8192"}}],"BYYE":["Yu Yu Hakusho - Ghostfiles - Spirit Detective",{"eeprom":{"size":"512"}}],"BYYP":["Yu Yu Hakusho - Ghostfiles - Spirit Detective",{"eeprom":{"size":"512"}}],"BRGE":["Yu Yu Hakusho - Ghostfiles - Tournament Tactics",{"eeprom":{"size":"8192"}}],"BY7E":["Yu-Gi-Oh! - 7 Trials to Glory - World Championship Tournament 2005",{"sram":{"size":"32768"}}],"BYOP":["Yu-Gi-Oh! - Day of the Duelist - World Championship Tournament 2005",{"sram":{"size":"32768"}}],"BYDP":["Yu-Gi-Oh! - Destiny Board Traveler",{"sram":{"size":"32768"}}],"BYDE":["Yu-Gi-Oh! - Destiny Board Traveler",{"sram":{"size":"32768"}}],"AYDE":["Yu-Gi-Oh! - Dungeon Dice Monsters",{"flash":{"size":"65536"}}],"AYDJ":["Yu-Gi-Oh! - Dungeon Dice Monsters",{"flash":{"size":"65536"}}],"AYDP":["Yu-Gi-Oh! - Dungeon Dice Monsters",{"flash":{"size":"65536"}}],"AY8P":["Yu-Gi-Oh! - Reshef of Destruction",{"sram":{"size":"32768"}}],"AY8E":["Yu-Gi-Oh! - Reshef of Destruction",{"sram":{"size":"32768"}}],"BYSJ":["Yu-Gi-Oh! - Sugoroku no Sugoroku",{"sram":{"size":"32768"}}],"AY5E":["Yu-Gi-Oh! - The Eternal Duelist Soul",{"sram":{"size":"32768"}}],"AY7E":["Yu-Gi-Oh! - The Sacred Cards",{"sram":{"size":"32768"}}],"AY7P":["Yu-Gi-Oh! - The Sacred Cards",{"sram":{"size":"32768"}}],"BY6E":["Yu-Gi-Oh! - Ultimate Masters - World Championship Tournament 2006",{"sram":{"size":"32768"}}],"BY6P":["Yu-Gi-Oh! - Ultimate Masters Edition - World Championship Tournament 2006",{"sram":{"size":"32768"}}],"BYWP":["Yu-Gi-Oh! - World Championship Tournament 2004",{"sram":{"size":"32768"}}],"BYWE":["Yu-Gi-Oh! - World Championship Tournament 2004",{"sram":{"size":"32768"}}],"AYWP":["Yu-Gi-Oh! - Worldwide Edition - Stairway to the Destined Duel",{"sram":{"size":"32768"}}],"AYWE":["Yu-Gi-Oh! - Worldwide Edition - Stairway to the Destined Duel",{"sram":{"size":"32768"}}],"BY2E":["Yu-Gi-Oh! Double Pack",{"sram":{"size":"32768"}}],"BY2P":["Yu-Gi-Oh! Double Pack",{"sram":{"size":"32768"}}],"BYVE":["Yu-Gi-Oh! Double Pack 2",{"sram":{"size":"32768"}}],"AY5J":["Yu-Gi-Oh! Duel Monsters 5 Expert 1",{"sram":{"size":"32768"}}],"AY6J":["Yu-Gi-Oh! Duel Monsters 6 Expert 2",{"sram":{"size":"32768"}}],"AY7J":["Yu-Gi-Oh! Duel Monsters 7 - Kettou Toshi Densetsu",{"sram":{"size":"32768"}}],"AY8J":["Yu-Gi-Oh! Duel Monsters 8 - Hametsu no Daijashin",{"sram":{"size":"32768"}}],"BY6J":["Yu-Gi-Oh! Duel Monsters Expert 2006",{"sram":{"size":"32768"}}],"BY3J":["Yu-Gi-Oh! Duel Monsters Expert 3",{"sram":{"size":"32768"}}],"BYGJ":["Yu-Gi-Oh! Duel Monsters GX - Mezase Duel King",{"sram":{"size":"32768"}}],"AYWJ":["Yu-Gi-Oh! Duel Monsters International - Worldwide Edition",{"sram":{"size":"32768"}}],"BYIJ":["Yu-Gi-Oh! Duel Monsters International 2",{"sram":{"size":"32768"}}],"BYGP":["Yu-Gi-Oh! GX - Duel Academy",{"sram":{"size":"32768"}}],"BYGE":["Yu-Gi-Oh! GX - Duel Academy",{"sram":{"size":"32768"}}],"AW3J":["Yumemi-chan no Naritai Series 3 - Watashi no Makesalon",{"eeprom":{"size":"512"}}],"A4VJ":["Yuujou no Victory Goal 4v4 Arashi - Get the Goal!!",{"sram":{"size":"32768"}}],"AUYJ":["Yuureiyashiki no Nijuuyojikan",{"eeprom":{"size":"512"}}],"AZEJ":["Z.O.E. 2173 - Testament",{"flash":{"size":"65536"}}],"AZPP":["Zapper",{"eeprom":{"size":"512"}}],"AZPE":["Zapper",{"eeprom":{"size":"512"}}],"A4GE":["Zatchbell! - Electric Arena",{"eeprom":{"size":"8192"}}],"BZMJ":["Zelda no Densetsu - Fushigi no Boushi",{"eeprom":{"size":"8192"}}],"AZLJ":["Zelda no Densetsu - Kamigami no Triforce & 4tsu no Tsurugi",{"eeprom":{"size":"8192"}}],"AGTJ":["Zen-Nihon GT Senshuken",{"flash":{"size":"65536"}}],"A2ZJ":["Zen-Nihon Shounen Soccer Taikai 2 - Mezase Nihon-ichi!",{"flash":{"size":"65536"}}],"AF3J":["Zero One",{"eeprom":{"size":"8192"}}],"BZOJ":["Zero One SP",{"eeprom":{"size":"8192"}}],"AZTJ":["Zero-Tours",{"flash":{"size":"65536"}}],"BZGJ":["Zettaizetsumei Dangerous Jiisan - Naki no 1-kai - Zettaifukujuu Violence Kouchou - Wagahai ga 1-ban Erainjai!!",{"sram":{"size":"32768"}}],"BZDJ":["Zettaizetsumei Dangerous Jiisan - Shijou Saikyou no Dogeza",{"sram":{"size":"32768"}}],"BJ3J":["Zettaizetsumei Dangerous Jiisan 3 - Hateshinaki Mamonogatari",{"sram":{"size":"32768"}}],"BZ2J":["Zettaizetsumei Dangerous Jiisan Tsuu - Ikari no Oshioki Blues",{"sram":{"size":"32768"}}],"AZDP":["Zidane Football Generation",{}],"BZYE":["Zoey 101",{}],"AZ2E":["Zoids Legacy",{"sram":{"size":"32768"}}],"ATZJ":["Zoids Saga",{"sram":{"size":"32768"}}],"BZFJ":["Zoids Saga Fuzors",{"sram":{"size":"32768"}}],"AZ2J":["Zoids Saga II",{"sram":{"size":"32768"}}],"U32J":["Zoku Bokura no Taiyou - Taiyou Shounen Django",{"eeprom":{"size":"8192"},"hasRTC":true}],"AZEP":["Zone of the Enders - The Fist of Mars",{"flash":{"size":"65536"}}],"AZEE":["Zone of the Enders - The Fist of Mars",{"flash":{"size":"65536"}}],"ANCP":["ZooCube",{"eeprom":{"size":"512"}}],"ANCE":["ZooCube",{"eeprom":{"size":"512"}}],"ANCJ":["ZooCube",{"eeprom":{"size":"512"}}],"BMZP":["Zooo",{"eeprom":{"size":"8192"}}],"BVDJ":["bit Generations - Boundish",{"sram":{"size":"32768"}}],"BVAJ":["bit Generations - Coloris",{"sram":{"size":"32768"}}],"BVBJ":["bit Generations - Dialhex",{"sram":{"size":"32768"}}],"BVHJ":["bit Generations - Digidrive",{"sram":{"size":"32768"}}],"BVCJ":["bit Generations - Dotstream",{"sram":{"size":"32768"}}],"BVEJ":["bit Generations - Orbital",{"sram":{"size":"32768"}}],"BVGJ":["bit Generations - Soundvoyager",{"sram":{"size":"32768"}}],"AX3F":["xXx",{"eeprom":{"size":"512"}}],"AX3E":["xXx",{"eeprom":{"size":"512"}}]}

/***/ }),
/* 10 */
/***/ (function(module, exports) {

(function () {
    "use strict";
    
    var defaultBindings = {}; 

    defaultBindings.KEY_BUTTON_A = {
        friendlyName: "A",
        codes: ["KeyZ"],
        keyCodes: [90],
    };
    defaultBindings.KEY_BUTTON_B = {
        friendlyName: "B",
        codes: ["KeyX"],
        keyCodes: [88],
    };
    defaultBindings.KEY_BUTTON_SELECT = {
        friendlyName: "Select",
        codes: ["Backspace"],
        keyCodes: [8],
    };
    defaultBindings.KEY_BUTTON_START = {
        friendlyName: "Start",
        codes: ["Enter"],
        keyCodes: [13],
    };
    defaultBindings.KEY_RIGHT = {
        friendlyName: "Right",
        codes: ["ArrowRight"],
        keyCodes: [39],
    };
    defaultBindings.KEY_LEFT = {
        friendlyName: "Left",
        codes: ["ArrowLeft"],
        keyCodes: [37],
    };
    defaultBindings.KEY_UP = {
        friendlyName: "Up",
        codes: ["ArrowUp"],
        keyCodes: [38],
    };
    defaultBindings.KEY_DOWN = {
        friendlyName: "Down",
        codes: ["ArrowDown"],
        keyCodes: [40],
    };
    defaultBindings.KEY_BUTTON_R = {
        friendlyName: "R",
        codes: ["Control"],
        keyCodes: [17],
    };
    defaultBindings.KEY_BUTTON_L = {
        friendlyName: "L",
        codes: ["Shift"],
        keyCodes: [16],
    };
    defaultBindings.PERF_STATS = {
        friendlyName: "Performance Stats",
        codes: ["Backquote"],
        keyCodes: [192],
    };
    

    function VBAInput() {
        
        
        this.downCodes = {};
        this.downKeyCodes = {};
        window.addEventListener("keydown", function (e) {

            var wasPerfKeyDownBefore = this.isKeyDown(this.bindings.PERF_STATS);

            this.downCodes[e.code] = 1;
            this.downKeyCodes[e.keyCode] = 1;

            var isPerfKeyDownNow = this.isKeyDown(this.bindings.PERF_STATS);
            if (!wasPerfKeyDownBefore && isPerfKeyDownNow) {
                window.doPerfCalc();
            }

            return false;
        }.bind(this));
        window.addEventListener("keyup", function (e) {

            var wasPerfKeyDownBefore = this.isKeyDown(this.bindings.PERF_STATS);

            this.downCodes[e.code] = 0;
            this.downKeyCodes[e.keyCode] = 0;
            
            var isPerfKeyDownNow = this.isKeyDown(this.bindings.PERF_STATS);
            if (wasPerfKeyDownBefore && !isPerfKeyDownNow) {
                window.doPerfCalc();
            }

            return false;
        }.bind(this));
        
        this.bindings = null;
        this.loadBindings();
        if (this.bindings === null) {
            this.resetBindings();
        }
        
    }
    VBAInput.prototype = Object.create(Object.prototype);
    VBAInput.prototype.constructor = VBAInput;
    
    
    VBAInput.prototype.listBindings = function () {
        return Object.keys(this.bindings).map(function (v) {
            return {
                name: v,
                friendlyName: this.bindings[v].friendlyName,
                codes: this.bindings[v].codes,
            };
        }.bind(this));
    };
    
    
    VBAInput.prototype.setBinding = function (name, code, keyCode) {
        this.bindings[name].codes = [code];
        this.bindings[name].keyCodes = [keyCode];
        this.saveBindings();
    };
    
    VBAInput.prototype.loadBindings = function (antiInfiniteLoopJustInCase) {
        this.bindings = JSON.parse(localStorage.VBABindings || "null") || defaultBindings;
        if (Object.keys(this.bindings).sort().join() !== Object.keys(defaultBindings).sort().join()) {
            // Binding keys are wrong
            if (antiInfiniteLoopJustInCase) {
                return;
            }
            this.resetBindings(true);
        }
    };
    
    VBAInput.prototype.saveBindings = function () {
        localStorage.VBABindings = JSON.stringify(this.bindings); 
    };
    
    VBAInput.prototype.resetBindings = function (antiInfiniteLoopJustInCase) {
        this.bindings = defaultBindings;
        // Lazy clone bindings object
        this.saveBindings();
        this.loadBindings(antiInfiniteLoopJustInCase);
    };
    
    VBAInput.prototype.isKeyDown = function (binding) {
        var i;
        for (i = 0; i < binding.codes.length; i++) {
            if (this.downCodes[binding.codes[i]]) {
                return true;
            }
        }
        for (i = 0; i < binding.keyCodes.length; i++) {
            if (this.downKeyCodes[binding.keyCodes[i]]) {
                return true;
            }
        }
    };
    
    
    VBAInput.prototype.getJoypad = function () {
        var res = 0;
        
        if (this.isKeyDown(this.bindings.KEY_BUTTON_A)) {
            res |= 1;
        }
        if (this.isKeyDown(this.bindings.KEY_BUTTON_B)) {
            res |= 2;
        }
        if (this.isKeyDown(this.bindings.KEY_BUTTON_SELECT)) {
            res |= 4;
        }
        if (this.isKeyDown(this.bindings.KEY_BUTTON_START)) {
            res |= 8;
        }
        if (this.isKeyDown(this.bindings.KEY_RIGHT)) {
            res |= 16;
        }
        if (this.isKeyDown(this.bindings.KEY_LEFT)) {
            res |= 32;
        }
        if (this.isKeyDown(this.bindings.KEY_UP)) {
            res |= 64;
        }
        if (this.isKeyDown(this.bindings.KEY_DOWN)) {
            res |= 128;
        }
        if (this.isKeyDown(this.bindings.KEY_BUTTON_R)) {
            res |= 256;
        }
        if (this.isKeyDown(this.bindings.KEY_BUTTON_L)) {
            res |= 512;
        }

        // disallow L+R or U+D from being pressed at the same time
        if ((res & 48) === 48) {
            res &= ~48;
        }
        if ((res & 192) === 192) {
            res &= ~192;
        }

        return res;
    };
    
    
    
    module.exports = VBAInput;
    
    
}());

/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

(function () {
    "use strict";
    
    
    function VBAUI(el) {
        this.el = el;
        
        this.currentlyBinding = false;
        this.initialHTML = el.innerHTML;
        
        this.el.addEventListener("keydown", this.onKeyDown.bind(this));
        
    }
    VBAUI.prototype = Object.create(Object.prototype);
    VBAUI.prototype.constructor = VBAUI;
    
    
    VBAUI.prototype.reset = function () {
        this.el.innerHTML = this.initialHTML;
        this.currentlyBinding = false;
        
        var i;
        var savesEl = window.document.querySelector(".saves-list");
        var savesHTML = "<table>";
        var saves = window.vbaSaves.listSaves();
        for (i = 0; i < saves.length; i++) {
            savesHTML += "<tr>" +
                "<td>[" + saves[i].romCode + "] " + __webpack_require__(0)(saves[i].romCode) + "</td>" +
                "<td><a class='export-save-button' onclick='vbaUI.exportSave(\"" + saves[i].romCode + "\")' href='javascript:void 0;' data-rom-code='" + saves[i].romCode + "'>Export</a></td>" +
                "<td><a class='delete-save-button' onclick='vbaUI.deleteSave(\"" + saves[i].romCode + "\")' href='javascript:void 0;' data-rom-code='" + saves[i].romCode + "'>Delete</a></td>" +
            "</tr>";
        }
        if (!saves.length) {
            savesHTML += "<tr><td>None</td></tr>";
        }
        if (window.isShittyLocalstorage) {
            savesHTML += "<tr><td><strong>Saving will not be possible because the 'LocalStorage'<br/>feature of your browser is disabled.</strong></td></tr>";
        }
        savesHTML += "</table>";
        savesEl.innerHTML = savesHTML;
        
        var keyboardBindingsEl = window.document.querySelector(".keyboard-bindings");
        var keyboardBindingsHTML = "<table>";
        var keyboardBindings = window.vbaInput.listBindings();
        for (i = 0; i < keyboardBindings.length; i++) {
            keyboardBindingsHTML += "<tr>" +
                "<td>" + keyboardBindings[i].friendlyName + "</td>" +
                "<td>" + keyboardBindings[i].codes.join(", ")
                    .replace(/Key/im, "Key ").replace(/Arrow/im, "Arrow ")
                    .replace(/Digit/im, "Digit ").replace(/Numpad/im, "Numpad ")
                    .replace(/Left/im, " Left").replace(/Right/im, " Right")
                     + "</td>" +
                "<td><a class='rebind-key-button' onclick='vbaUI.startRebinding(this, \"" + keyboardBindings[i].name + "\")' href='javascript:void 0;'>Rebind</a></td>" +
            "</tr>";
        }
        keyboardBindingsHTML += "</table>";
        keyboardBindingsEl.innerHTML = keyboardBindingsHTML;
        
    };
    
    VBAUI.prototype.export = function () {
        vbaSaves.exportSave();
    };
    
    
    VBAUI.prototype.onKeyDown = function (e) {
        if (this.currentlyBinding) {
            var prev = vbaInput.bindings[this.currentlyBinding].codes.join();
            vbaInput.setBinding(this.currentlyBinding, e.code, e.keyCode);
            var current = vbaInput.bindings[this.currentlyBinding].codes.join();
            
            gtag("event", "rebind_key_1", {
                event_label: "Change " + this.currentlyBinding + " from " + prev + " to " + current,
            });

            this.reset();
        }
    };
    
    
    VBAUI.prototype.startRebinding = function (el, name) {
        this.currentlyBinding = name;
        this.el.querySelectorAll(".rebind-key-button").forEach(function (el) {
            el.innerText = "Rebind";
        });
        el.innerText = "Rebinding...";
    };
    
    VBAUI.prototype.resetBindings = function () {
        
        gtag("event", "reset_bindings_1", {});

        vbaInput.resetBindings();
        this.reset();
    };
    
    VBAUI.prototype.exportSave = function (romCode) {
        vbaSaves.exportSave(romCode);
        this.reset();

        gtag("event", "export_save_1", {
            event_label: romCode + " " + __webpack_require__(0)(romCode),
        });

    };
    
    VBAUI.prototype.deleteSave = function (romCode) {

        var modalOpts = modal("Are you sure you want to delete your save for [" + romCode + "] " + __webpack_require__(0)(romCode) + "?", {
            title: "Confirm Deletion",
            leftButtonText: "Delete",
            leftButtonFn: function () {
                
                vbaSaves.deleteSave(romCode);
                this.reset();
                gtag("event", "delete_save_1", {
                    event_label: romCode + " " + __webpack_require__(0)(romCode),
                });

            }.bind(this),
            rightButtonText: "Cancel",
            rightButtonFn: function () {
                modalOpts.hideModal();
            },
        });
        
    };
    
    module.exports = VBAUI;
    
    
}());

/***/ })
/******/ ]);
