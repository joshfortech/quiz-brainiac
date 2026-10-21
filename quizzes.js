(function () {
  'use strict';

  var QUIZZES = {
    science: {
      title: 'Basic Science Quiz',
      questions: [
        {
          question: 'Which planet in our solar system is known as the Red Planet?',
          options: ['Venus', 'Mars', 'Jupiter', 'Mercury'],
          correctIndex: 1
        },
        {
          question: 'Which state of matter keeps its own shape and its own volume?',
          options: ['Liquid', 'Gas', 'Solid', 'Plasma'],
          correctIndex: 2
        },
        {
          question: 'Which of these animals is a mammal?',
          options: ['Shark', 'Dolphin', 'Penguin', 'Lizard'],
          correctIndex: 1
        }
      ]
    },
    history: {
      title: 'History Quiz',
      questions: [
        {
          question: 'Who was the first President of the United States?',
          options: ['Abraham Lincoln', 'George Washington', 'Thomas Jefferson', 'Theodore Roosevelt'],
          correctIndex: 1
        },
        {
          question: 'The ancient pyramids of Giza were built by which civilization?',
          options: ['Ancient Romans', 'Ancient Greeks', 'Ancient Egyptians', 'Ancient Mayans'],
          correctIndex: 2
        },
        {
          question: 'In which year did World War II end?',
          options: ['1918', '1939', '1945', '1950'],
          correctIndex: 2
        }
      ]
    }
  };

  var CHEERS = {
    perfect: [
      'Perfect score! You are a total brainiac!',
      'Wow - all correct! Amazing work!',
      'Three out of three! You are a superstar!'
    ],
    good: [
      'Great job - you almost nailed it!',
      'Nice work! One more try could make it perfect.',
      'Awesome effort - you know your stuff!'
    ],
    okay: [
      'Good try! Watch the video once more and try again.',
      'Not bad! A second look at the video will help.',
      'You are on your way - give it another go!'
    ],
    low: [
      'Keep going! Rewatch the video and try again - you can do it!',
      'Great effort for a first try! Have another go.',
      'Every brainiac starts somewhere - try again!'
    ]
  };

  var quizRoot = document.getElementById('quiz-root');
  var subject = document.body.getAttribute('data-subject');
  var quiz = QUIZZES[subject];
  var submitted = false;

  function esc(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function cheerFor(score, total) {
    var pool;
    if (score === total) pool = CHEERS.perfect;
    else if (score === total - 1) pool = CHEERS.good;
    else if (score >= 1) pool = CHEERS.okay;
    else pool = CHEERS.low;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function renderQuiz() {
    submitted = false;
    var html = '<form id="quiz-form" novalidate>';

    quiz.questions.forEach(function (q, qi) {
      html += '<div class="question-card" data-question="' + qi + '">' +
        '<fieldset>' +
        '<legend><span class="question-number">Q' + (qi + 1) + '.</span>' + esc(q.question) + '</legend>' +
        '<div class="options-list">';

      q.options.forEach(function (opt, oi) {
        var id = 'q' + qi + '-o' + oi;
        html += '<label class="option" for="' + id + '">' +
          '<input type="radio" id="' + id + '" name="question-' + qi + '" value="' + oi + '">' +
          '<span>' + esc(opt) + '</span>' +
          '</label>';
      });

      html += '</div></fieldset></div>';
    });

    html += '<p class="quiz-message" id="quiz-message" role="alert" aria-live="polite"></p>' +
      '<div class="quiz-actions">' +
      '<button type="submit" class="btn btn-primary btn-large">Submit Answers</button>' +
      '</div></form>' +
      '<div id="quiz-results" hidden></div>';

    quizRoot.innerHTML = html;
    document.getElementById('quiz-form').addEventListener('submit', onSubmit);

    quizRoot.querySelectorAll('input[type="radio"]').forEach(function (input) {
      input.addEventListener('change', function () {
        var card = input.closest('.question-card');
        if (card) card.classList.remove('unanswered');
        var msg = document.getElementById('quiz-message');
        if (msg) msg.textContent = '';
      });
    });
  }

  function onSubmit(e) {
    e.preventDefault();
    if (submitted) return;

    var message = document.getElementById('quiz-message');
    var answers = [];
    var firstUnanswered = null;

    quiz.questions.forEach(function (q, qi) {
      var checked = quizRoot.querySelector('input[name="question-' + qi + '"]:checked');
      var card = quizRoot.querySelector('.question-card[data-question="' + qi + '"]');
      if (checked) {
        answers[qi] = Number(checked.value);
        if (card) card.classList.remove('unanswered');
      } else {
        answers[qi] = null;
        if (card) card.classList.add('unanswered');
        if (firstUnanswered === null) firstUnanswered = { qi: qi, card: card };
      }
    });

    if (firstUnanswered) {
      message.textContent =
        'Almost there! Please answer question ' + (firstUnanswered.qi + 1) +
        ' before submitting.';
      firstUnanswered.card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var firstRadio = firstUnanswered.card.querySelector('input[type="radio"]');
      if (firstRadio) firstRadio.focus();
      return;
    }

    showResults(answers);
  }

  function showResults(answers) {
    submitted = true;

    var total = quiz.questions.length;
    var score = 0;
    var listHtml = '';

    quiz.questions.forEach(function (q, qi) {
      var given = answers[qi];
      var correct = given === q.correctIndex;
      if (correct) score++;

      listHtml += '<li class="result-item ' + (correct ? 'is-correct' : 'is-wrong') + '">' +
        '<p class="result-verdict">' + (correct ? 'Correct!' : 'Not quite.') + '</p>' +
        '<p class="result-question">Q' + (qi + 1) + '. ' + esc(q.question) + '</p>' +
        '<p class="result-detail">Your answer: ' + esc(q.options[given]) + '</p>' +
        (correct ? '' : '<p class="result-detail">Correct answer: ' + esc(q.options[q.correctIndex]) + '</p>') +
        '</li>';
    });

    var results = document.getElementById('quiz-results');
    results.innerHTML =
      '<div class="results-score">' +
      '<p class="score-number">You got ' + score + ' out of ' + total + '!</p>' +
      '<p class="score-cheer">' + esc(cheerFor(score, total)) + '</p>' +
      '</div>' +
      '<h3>Your answers</h3>' +
      '<ul class="result-list">' + listHtml + '</ul>' +
      '<div class="quiz-actions">' +
      '<button type="button" class="btn btn-primary btn-large" id="retry-quiz">Try Again</button>' +
      '<a class="btn btn-cream btn-large" href="index.html">Back to Home</a>' +
      '</div>';

    document.getElementById('quiz-form').hidden = true;
    document.getElementById('quiz-message').textContent = '';
    results.hidden = false;
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });

    document.getElementById('retry-quiz').addEventListener('click', function () {
      results.hidden = true;
      results.innerHTML = '';
      renderQuiz();
      quizRoot.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!quizRoot || !quiz) {
      if (quizRoot) {
        quizRoot.innerHTML = '<p class="quiz-intro">Quiz content could not be loaded. Please go back and try again.</p>';
      }
      return;
    }
    renderQuiz();
  });
})();
