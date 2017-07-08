Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { var callNext = step.bind(null, 'next'); var callThrow = step.bind(null, 'throw'); function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(callNext, callThrow); } } callNext(); }); }; }

/** @babel */

var _chartJs = require('chart.js');

var _chartJs2 = _interopRequireDefault(_chartJs);

var _glob = require('glob');

var _glob2 = _interopRequireDefault(_glob);

var _fsPlus = require('fs-plus');

var _fsPlus2 = _interopRequireDefault(_fsPlus);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

exports['default'] = _asyncToGenerator(function* (_ref) {
  var test = _ref.test;
  var benchmarkPaths = _ref.benchmarkPaths;

  document.body.style.backgroundColor = '#ffffff';
  document.body.style.overflow = 'auto';

  var paths = [];
  for (var benchmarkPath of benchmarkPaths) {
    if (_fsPlus2['default'].isDirectorySync(benchmarkPath)) {
      paths = paths.concat(_glob2['default'].sync(_path2['default'].join(benchmarkPath, '**', '*.bench.js')));
    } else {
      paths.push(benchmarkPath);
    }
  }

  while (paths.length > 0) {
    var benchmark = require(paths.shift())({ test: test });
    var results = undefined;
    if (benchmark instanceof Promise) {
      results = yield benchmark;
    } else {
      results = benchmark;
    }

    var dataByBenchmarkName = {};
    for (var _ref22 of results) {
      var _name = _ref22.name;
      var duration = _ref22.duration;
      var x = _ref22.x;

      dataByBenchmarkName[_name] = dataByBenchmarkName[_name] || { points: [] };
      dataByBenchmarkName[_name].points.push({ x: x, y: duration });
    }

    var benchmarkContainer = document.createElement('div');
    document.body.appendChild(benchmarkContainer);
    for (var key in dataByBenchmarkName) {
      var data = dataByBenchmarkName[key];
      if (data.points.length > 1) {
        var canvas = document.createElement('canvas');
        benchmarkContainer.appendChild(canvas);
        var chart = new _chartJs2['default'](canvas, {
          type: 'line',
          data: {
            datasets: [{ label: key, fill: false, data: data.points }]
          },
          options: {
            showLines: false,
            scales: { xAxes: [{ type: 'linear', position: 'bottom' }] }
          }
        });

        var textualOutput = key + ':\n\n' + data.points.map(function (p) {
          return p.x + '\t' + p.y;
        }).join('\n');
        console.log(textualOutput);
      } else {
        var title = document.createElement('h2');
        title.textContent = key;
        benchmarkContainer.appendChild(title);
        var duration = document.createElement('p');
        duration.textContent = data.points[0].y + 'ms';
        benchmarkContainer.appendChild(duration);

        var textualOutput = key + ': ' + data.points[0].y;
        console.log(textualOutput);
      }

      global.atom.reset();
    }
  }

  return 0;
});
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovcHJvamVjdHMvYXRvbS9vdXQvYXBwL2JlbmNobWFya3MvYmVuY2htYXJrLXJ1bm5lci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O3VCQUVrQixVQUFVOzs7O29CQUNYLE1BQU07Ozs7c0JBQ1IsU0FBUzs7OztvQkFDUCxNQUFNOzs7O3VDQUVSLFdBQWdCLElBQXNCLEVBQUU7TUFBdkIsSUFBSSxHQUFMLElBQXNCLENBQXJCLElBQUk7TUFBRSxjQUFjLEdBQXJCLElBQXNCLENBQWYsY0FBYzs7QUFDbEQsVUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLFNBQVMsQ0FBQTtBQUMvQyxVQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFBOztBQUVyQyxNQUFJLEtBQUssR0FBRyxFQUFFLENBQUE7QUFDZCxPQUFLLElBQU0sYUFBYSxJQUFJLGNBQWMsRUFBRTtBQUMxQyxRQUFJLG9CQUFHLGVBQWUsQ0FBQyxhQUFhLENBQUMsRUFBRTtBQUNyQyxXQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxrQkFBSyxJQUFJLENBQUMsa0JBQUssSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQzlFLE1BQU07QUFDTCxXQUFLLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFBO0tBQzFCO0dBQ0Y7O0FBRUQsU0FBTyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtBQUN2QixRQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBQyxJQUFJLEVBQUosSUFBSSxFQUFDLENBQUMsQ0FBQTtBQUNoRCxRQUFJLE9BQU8sWUFBQSxDQUFBO0FBQ1gsUUFBSSxTQUFTLFlBQVksT0FBTyxFQUFFO0FBQ2hDLGFBQU8sR0FBRyxNQUFNLFNBQVMsQ0FBQTtLQUMxQixNQUFN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ZW5jaG1hcmtzL2JlbmNobWFyay1ydW5uZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiogQGJhYmVsICovXG5cbmltcG9ydCBDaGFydCBmcm9tICdjaGFydC5qcydcbmltcG9ydCBnbG9iIGZyb20gJ2dsb2InXG5pbXBvcnQgZnMgZnJvbSAnZnMtcGx1cydcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uICh7dGVzdCwgYmVuY2htYXJrUGF0aHN9KSB7XG4gIGRvY3VtZW50LmJvZHkuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJyNmZmZmZmYnXG4gIGRvY3VtZW50LmJvZHkuc3R5bGUub3ZlcmZsb3cgPSAnYXV0bydcblxuICBsZXQgcGF0aHMgPSBbXVxuICBmb3IgKGNvbnN0IGJlbmNobWFya1BhdGggb2YgYmVuY2htYXJrUGF0aHMpIHtcbiAgICBpZiAoZnMuaXNEaXJlY3RvcnlTeW5jKGJlbmNobWFya1BhdGgpKSB7XG4gICAgICBwYXRocyA9IHBhdGhzLmNvbmNhdChnbG9iLnN5bmMocGF0aC5qb2luKGJlbmNobWFya1BhdGgsICcqKicsICcqLmJlbmNoLmpzJykpKVxuICAgIH0gZWxzZSB7XG4gICAgICBwYXRocy5wdXNoKGJlbmNobWFya1BhdGgpXG4gICAgfVxuICB9XG5cbiAgd2hpbGUgKHBhdGhzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBiZW5jaG1hcmsgPSByZXF1aXJlKHBhdGhzLnNoaWZ0KCkpKHt0ZXN0fSlcbiAgICBsZXQgcmVzdWx0c1xuICAgIGlmIChiZW5jaG1hcmsgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICByZXN1bHRzID0gYXdhaXQgYmVuY2htYXJrXG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdHMgPSBiZW5jaG1hcmtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhQnlCZW5jaG1hcmtOYW1lID0ge31cbiAgICBmb3IgKGNvbnN0IHtuYW1lLCBkdXJhdGlvbiwgeH0gb2YgcmVzdWx0cykge1xuICAgICAgZGF0YUJ5QmVuY2htYXJrTmFtZVtuYW1lXSA9IGRhdGFCeUJlbmNobWFya05hbWVbbmFtZV0gfHwge3BvaW50czogW119XG4gICAgICBkYXRhQnlCZW5jaG1hcmtOYW1lW25hbWVdLnBvaW50cy5wdXNoKHt4LCB5OiBkdXJhdGlvbn0pXG4gICAgfVxuXG4gICAgY29uc3QgYmVuY2htYXJrQ29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGJlbmNobWFya0NvbnRhaW5lcilcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBkYXRhQnlCZW5jaG1hcmtOYW1lKSB7XG4gICAgICBjb25zdCBkYXRhID0gZGF0YUJ5QmVuY2htYXJrTmFtZVtrZXldXG4gICAgICBpZiAoZGF0YS5wb2ludHMubGVuZ3RoID4gMSkge1xuICAgICAgICBjb25zdCBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKVxuICAgICAgICBiZW5jaG1hcmtDb250YWluZXIuYXBwZW5kQ2hpbGQoY2FudmFzKVxuICAgICAgICBjb25zdCBjaGFydCA9IG5ldyBDaGFydChjYW52YXMsIHtcbiAgICAgICAgICB0eXBlOiAnbGluZScsXG4gICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgZGF0YXNldHM6IFt7bGFiZWw6IGtleSwgZmlsbDogZmFsc2UsIGRhdGE6IGRhdGEucG9pbnRzfV1cbiAgICAgICAgICB9LFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIHNob3dMaW5lczogZmFsc2UsXG4gICAgICAgICAgICBzY2FsZXM6IHt4QXhlczogW3t0eXBlOiAnbGluZWFyJywgcG9zaXRpb246ICdib3R0b20nfV19XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIGNvbnN0IHRleHR1YWxPdXRwdXQgPSBgJHtrZXl9OlxcblxcbmAgKyBkYXRhLnBvaW50cy5tYXAoKHApID0+IGAke3AueH1cXHQke3AueX1gKS5qb2luKCdcXG4nKVxuICAgICAgICBjb25zb2xlLmxvZyh0ZXh0dWFsT3V0cHV0KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgdGl0bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdoMicpXG4gICAgICAgIHRpdGxlLnRleHRDb250ZW50ID0ga2V5XG4gICAgICAgIGJlbmNobWFya0NvbnRhaW5lci5hcHBlbmRDaGlsZCh0aXRsZSlcbiAgICAgICAgY29uc3QgZHVyYXRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJylcbiAgICAgICAgZHVyYXRpb24udGV4dENvbnRlbnQgPSBgJHtkYXRhLnBvaW50c1swXS55fW1zYFxuICAgICAgICBiZW5jaG1hcmtDb250YWluZXIuYXBwZW5kQ2hpbGQoZHVyYXRpb24pXG5cbiAgICAgICAgY29uc3QgdGV4dHVhbE91dHB1dCA9IGAke2tleX06ICR7ZGF0YS5wb2ludHNbMF0ueX1gXG4gICAgICAgIGNvbnNvbGUubG9nKHRleHR1YWxPdXRwdXQpXG4gICAgICB9XG5cbiAgICAgIGdsb2JhbC5hdG9tLnJlc2V0KClcbiAgICB9XG4gIH1cblxuICByZXR1cm4gMFxufVxuIl19