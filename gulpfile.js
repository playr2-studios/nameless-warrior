var gulp        = require('gulp'),
    browserSync = require('browser-sync').create(),
    compass     = require('gulp-compass');

// Static Server + watching scss/html files
gulp.task('serve', ['compass'], function() {
  browserSync.init({
      server: "./app"
  });

  gulp.watch("app/sass/*.scss", ['compass']);
  gulp.watch("app/*.html").on('change', browserSync.reload);
});

// Compile compass into CSS & auto-inject into browsers
gulp.task('compass', function() {
    return gulp.src("app/sass/*.scss")
      .pipe(compass({    
        sass: 'app/sass',
        css: 'app/css',
        require: ['susy']
      }))
      .pipe(gulp.dest("app/css"))
      .pipe(browserSync.stream());
});

gulp.task('default', ['serve']);