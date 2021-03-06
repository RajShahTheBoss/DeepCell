/** @babel */

var fs = require('fs-plus');
var path = require('path');

var hasWriteAccess = function hasWriteAccess(dir) {
  var testFilePath = path.join(dir, 'write.test');
  try {
    fs.writeFileSync(testFilePath, new Date().toISOString(), { flag: 'w+' });
    fs.unlinkSync(testFilePath);
    return true;
  } catch (err) {
    return false;
  }
};

var getAppDirectory = function getAppDirectory() {
  switch (process.platform) {
    case 'darwin':
      return process.execPath.substring(0, process.execPath.indexOf('.app') + 4);
    case 'linux':
    case 'win32':
      return path.join(process.execPath, '..');
  }
};

module.exports = {
  setAtomHome: function setAtomHome(homePath) {
    // When a read-writeable .atom folder exists above app use that
    var portableHomePath = path.join(getAppDirectory(), '..', '.atom');
    if (fs.existsSync(portableHomePath)) {
      if (hasWriteAccess(portableHomePath)) {
        process.env.ATOM_HOME = portableHomePath;
      } else {
        // A path exists so it was intended to be used but we didn't have rights, so warn.
        console.log('Insufficient permission to portable Atom home "' + portableHomePath + '".');
      }
    }

    // Check ATOM_HOME environment variable next
    if (process.env.ATOM_HOME !== undefined) {
      return;
    }

    // Fall back to default .atom folder in users home folder
    process.env.ATOM_HOME = path.join(homePath, '.atom');
  },

  setUserData: function setUserData(app) {
    var electronUserDataPath = path.join(process.env.ATOM_HOME, 'electronUserData');
    if (fs.existsSync(electronUserDataPath)) {
      if (hasWriteAccess(electronUserDataPath)) {
        app.setPath('userData', electronUserDataPath);
      } else {
        // A path exists so it was intended to be used but we didn't have rights, so warn.
        console.log('Insufficient permission to Electron user data "' + electronUserDataPath + '".');
      }
    }
  },

  getAppDirectory: getAppDirectory
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovcHJvamVjdHMvYXRvbS9vdXQvYXBwL3NyYy9hdG9tLXBhdGhzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUEsSUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0FBQzdCLElBQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTs7QUFFNUIsSUFBTSxjQUFjLEdBQUcsU0FBakIsY0FBYyxDQUFJLEdBQUcsRUFBSztBQUM5QixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxZQUFZLENBQUMsQ0FBQTtBQUNqRCxNQUFJO0FBQ0YsTUFBRSxDQUFDLGFBQWEsQ0FBQyxZQUFZLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0FBQ3hFLE1BQUUsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUE7QUFDM0IsV0FBTyxJQUFJLENBQUE7R0FDWixDQUFDLE9BQU8sR0FBRyxFQUFFO0FBQ1osV0FBTyxLQUFLLENBQUE7R0FDYjtDQUNGLENBQUE7O0FBRUQsSUFBTSxlQUFlLEdBQUcsU0FBbEIsZUFBZSxHQUFTO0FBQzVCLFVBQVEsT0FBTyxDQUFDLFFBQVE7QUFDdEIsU0FBSyxRQUFRO0FBQ1gsYUFBTyxPQUFPLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFBQSxBQUM1RSxTQUFLLE9BQU8sQ0FBQztBQUNiLFNBQUssT0FBTztBQUNWLGFBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO0FBQUEsR0FDM0M7Q0FDRixDQUFBOztBQUVELE1BQU0sQ0FBQyxPQUFPLEdBQUc7QUFDZixhQUFXLEVBQUUscUJBQUMsUUFBUSxFQUFLOztBQUV6QixRQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0FBQ3BFLFFBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO0FBQ25DLFVBQUksY0FBYyxDQUFDLGdCQUFnQixDQUFDLEVBQUU7QUFDcEMsZUFBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEdBQUcsZ0JBQWdCLENBQUE7T0FDekMsTUFBTTs7QUFFTCxlQUFPLENBQUMsR0FBRyxxREFBbUQsZ0JBQWdCLFFBQUssQ0FBQTtPQUNwRjtLQUNGOzs7QUFHRCxRQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxLQUFLLFNBQVMsRUFBRTtBQUN2QyxhQUFNO0tBQ1A7OztBQUdELFdBQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0dBQ3JEOztBQUVELGFBQVcsRUFBRSxxQkFBQyxHQUFHLEVBQUs7QUFDcEIsUUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLGtCQUFrQixDQUFDLENBQUE7QUFDakYsUUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLG9CQUFvQixDQUFDLEVBQUU7QUFDdkMsVUFBSSxjQUFjLENBQUMsb0JBQW9CLENBQUMsRUFBRTtBQUN4QyxXQUFHLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO09BQzlDLE1BQU07O0FBRUwsZUFBTyxDQUFDLEdBQUcscURBQW1ELG9CQUFvQixRQUFLLENBQUE7T0FDeEY7S0FDRjtHQUNGOztBQUVELGlCQUFlLEVBQUUsZUFBZTtDQUNqQyxDQUFBIiwiZmlsZSI6ImZpbGU6Ly8vQzovcHJvamVjdHMvYXRvbS9vdXQvYXBwL3NyYy9hdG9tLXBhdGhzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqIEBiYWJlbCAqL1xuXG5jb25zdCBmcyA9IHJlcXVpcmUoJ2ZzLXBsdXMnKVxuY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKVxuXG5jb25zdCBoYXNXcml0ZUFjY2VzcyA9IChkaXIpID0+IHtcbiAgY29uc3QgdGVzdEZpbGVQYXRoID0gcGF0aC5qb2luKGRpciwgJ3dyaXRlLnRlc3QnKVxuICB0cnkge1xuICAgIGZzLndyaXRlRmlsZVN5bmModGVzdEZpbGVQYXRoLCBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksIHsgZmxhZzogJ3crJyB9KVxuICAgIGZzLnVubGlua1N5bmModGVzdEZpbGVQYXRoKVxuICAgIHJldHVybiB0cnVlXG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbmNvbnN0IGdldEFwcERpcmVjdG9yeSA9ICgpID0+IHtcbiAgc3dpdGNoIChwcm9jZXNzLnBsYXRmb3JtKSB7XG4gICAgY2FzZSAnZGFyd2luJzpcbiAgICAgIHJldHVybiBwcm9jZXNzLmV4ZWNQYXRoLnN1YnN0cmluZygwLCBwcm9jZXNzLmV4ZWNQYXRoLmluZGV4T2YoJy5hcHAnKSArIDQpXG4gICAgY2FzZSAnbGludXgnOlxuICAgIGNhc2UgJ3dpbjMyJzpcbiAgICAgIHJldHVybiBwYXRoLmpvaW4ocHJvY2Vzcy5leGVjUGF0aCwgJy4uJylcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgc2V0QXRvbUhvbWU6IChob21lUGF0aCkgPT4ge1xuICAgIC8vIFdoZW4gYSByZWFkLXdyaXRlYWJsZSAuYXRvbSBmb2xkZXIgZXhpc3RzIGFib3ZlIGFwcCB1c2UgdGhhdFxuICAgIGNvbnN0IHBvcnRhYmxlSG9tZVBhdGggPSBwYXRoLmpvaW4oZ2V0QXBwRGlyZWN0b3J5KCksICcuLicsICcuYXRvbScpXG4gICAgaWYgKGZzLmV4aXN0c1N5bmMocG9ydGFibGVIb21lUGF0aCkpIHtcbiAgICAgIGlmIChoYXNXcml0ZUFjY2Vzcyhwb3J0YWJsZUhvbWVQYXRoKSkge1xuICAgICAgICBwcm9jZXNzLmVudi5BVE9NX0hPTUUgPSBwb3J0YWJsZUhvbWVQYXRoXG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBBIHBhdGggZXhpc3RzIHNvIGl0IHdhcyBpbnRlbmRlZCB0byBiZSB1c2VkIGJ1dCB3ZSBkaWRuJ3QgaGF2ZSByaWdodHMsIHNvIHdhcm4uXG4gICAgICAgIGNvbnNvbGUubG9nKGBJbnN1ZmZpY2llbnQgcGVybWlzc2lvbiB0byBwb3J0YWJsZSBBdG9tIGhvbWUgXCIke3BvcnRhYmxlSG9tZVBhdGh9XCIuYClcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBBVE9NX0hPTUUgZW52aXJvbm1lbnQgdmFyaWFibGUgbmV4dFxuICAgIGlmIChwcm9jZXNzLmVudi5BVE9NX0hPTUUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gRmFsbCBiYWNrIHRvIGRlZmF1bHQgLmF0b20gZm9sZGVyIGluIHVzZXJzIGhvbWUgZm9sZGVyXG4gICAgcHJvY2Vzcy5lbnYuQVRPTV9IT01FID0gcGF0aC5qb2luKGhvbWVQYXRoLCAnLmF0b20nKVxuICB9LFxuXG4gIHNldFVzZXJEYXRhOiAoYXBwKSA9PiB7XG4gICAgY29uc3QgZWxlY3Ryb25Vc2VyRGF0YVBhdGggPSBwYXRoLmpvaW4ocHJvY2Vzcy5lbnYuQVRPTV9IT01FLCAnZWxlY3Ryb25Vc2VyRGF0YScpXG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoZWxlY3Ryb25Vc2VyRGF0YVBhdGgpKSB7XG4gICAgICBpZiAoaGFzV3JpdGVBY2Nlc3MoZWxlY3Ryb25Vc2VyRGF0YVBhdGgpKSB7XG4gICAgICAgIGFwcC5zZXRQYXRoKCd1c2VyRGF0YScsIGVsZWN0cm9uVXNlckRhdGFQYXRoKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQSBwYXRoIGV4aXN0cyBzbyBpdCB3YXMgaW50ZW5kZWQgdG8gYmUgdXNlZCBidXQgd2UgZGlkbid0IGhhdmUgcmlnaHRzLCBzbyB3YXJuLlxuICAgICAgICBjb25zb2xlLmxvZyhgSW5zdWZmaWNpZW50IHBlcm1pc3Npb24gdG8gRWxlY3Ryb24gdXNlciBkYXRhIFwiJHtlbGVjdHJvblVzZXJEYXRhUGF0aH1cIi5gKVxuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBnZXRBcHBEaXJlY3Rvcnk6IGdldEFwcERpcmVjdG9yeVxufVxuIl19