(function() {
  var ChunkedLineReader, Readable, StringDecoder, fs, isBinaryFile, lastIndexOf,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  fs = require("fs");

  isBinaryFile = require("isbinaryfile");

  Readable = require('stream').Readable;

  StringDecoder = require('string_decoder').StringDecoder;

  lastIndexOf = function(buffer, length, char) {
    var i;
    i = length;
    while (i--) {
      if (buffer[i] === char) {
        return i;
      }
    }
    return -1;
  };

  module.exports = ChunkedLineReader = (function(superClass) {
    extend(ChunkedLineReader, superClass);

    ChunkedLineReader.CHUNK_SIZE = 10240;

    ChunkedLineReader.chunkedBuffer = null;

    ChunkedLineReader.headerBuffer = new Buffer(256);

    function ChunkedLineReader(filePath, options) {
      var ref;
      this.filePath = filePath;
      this.encoding = (ref = options != null ? options.encoding : void 0) != null ? ref : "utf8";
      ChunkedLineReader.__super__.constructor.call(this);
    }

    ChunkedLineReader.prototype.isBinaryFile = function() {
      var fd, isBin;
      fd = fs.openSync(this.filePath, "r");
      isBin = isBinaryFile(this.constructor.headerBuffer, fs.readSync(fd, this.constructor.headerBuffer, 0, 256));
      fs.closeSync(fd);
      return isBin;
    };

    ChunkedLineReader.prototype._read = function() {
      var base, bytesRead, char, chunkSize, chunkedBuffer, decoder, error, fd, index, line, newRemainder, offset, remainder, str;
      try {
        fd = fs.openSync(this.filePath, "r");
        line = 0;
        offset = 0;
        remainder = '';
        chunkSize = this.constructor.CHUNK_SIZE;
        if (isBinaryFile(this.constructor.headerBuffer, fs.readSync(fd, this.constructor.headerBuffer, 0, 256))) {
          return;
        }
        if ((base = this.constructor).chunkedBuffer == null) {
          base.chunkedBuffer = new Buffer(chunkSize);
        }
        chunkedBuffer = this.constructor.chunkedBuffer;
        bytesRead = fs.readSync(fd, chunkedBuffer, 0, chunkSize, 0);
        decoder = new StringDecoder(this.encoding);
        while (bytesRead) {
          char = 10;
          index = lastIndexOf(chunkedBuffer, bytesRead, char);
          if (index < 0) {
            newRemainder = decoder.write(chunkedBuffer.slice(0, bytesRead));
            str = null;
          } else if (index > -1 && index === bytesRead - 1) {
            newRemainder = '';
            str = decoder.write(chunkedBuffer.slice(0, bytesRead));
          } else {
            str = decoder.write(chunkedBuffer.slice(0, index + 1));
            newRemainder = decoder.write(chunkedBuffer.slice(index + 1, bytesRead));
          }
          if (str) {
            if (remainder) {
              str = remainder + str;
            }
            this.push(str);
            remainder = newRemainder;
          } else {
            remainder = remainder + newRemainder;
          }
          offset += bytesRead;
          bytesRead = fs.readSync(fd, chunkedBuffer, 0, chunkSize, offset);
        }
        if (remainder) {
          return this.push(remainder);
        }
      } catch (_error) {
        error = _error;
        return this.emit('error', error);
      } finally {
        if (fd != null) {
          fs.closeSync(fd);
        }
        this.push(null);
      }
    };

    return ChunkedLineReader;

  })(Readable);

}).call(this);
