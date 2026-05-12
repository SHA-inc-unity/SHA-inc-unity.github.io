(function() {
  function getAge() {
    var birth = new Date(2004, 8, 8);
    var now = new Date();
    var age = now.getFullYear() - birth.getFullYear();
    var monthDelta = now.getMonth() - birth.getMonth();

    if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }

  function getRussianAgeLabel(age) {
    var remainder10 = age % 10;
    var remainder100 = age % 100;

    if (remainder100 >= 11 && remainder100 <= 14) {
      return age + ' лет';
    }
    if (remainder10 === 1) {
      return age + ' год';
    }
    if (remainder10 >= 2 && remainder10 <= 4) {
      return age + ' года';
    }
    return age + ' лет';
  }

  function getAgeLabel(locale) {
    var age = getAge();
    return locale === 'ru' ? getRussianAgeLabel(age) : age + ' years old';
  }

  function updateAge(locale) {
    var label = getAgeLabel(locale);
    var nodes = document.querySelectorAll('[data-resume-age]');

    nodes.forEach(function(node) {
      node.textContent = label;
    });
  }

  async function exportResumePdf(options, isAutoMode) {
    var button = document.getElementById('download-pdf');
    var originalText = button ? button.textContent : '';
    var messages = options.messages || {};

    document.body.classList.add('pdf-export');

    if (button) {
      button.disabled = true;
      button.textContent = messages.generating || 'Generating PDF...';
    }

    try {
      if (!window.html2pdf) {
        throw new Error('html2pdf is unavailable');
      }

      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      await new Promise(function(resolve) {
        requestAnimationFrame(function() {
          requestAnimationFrame(resolve);
        });
      });

      await window.html2pdf()
        .set({
          margin: [20, 18, 20, 18],
          filename: options.pdfFilename || 'Artem_Shloma_Resume.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#faf9f7'
          },
          pagebreak: {
            mode: ['css', 'legacy'],
            avoid: ['.cv-header', '.cv-intro', '.cv-entry', '.cv-entry-body', '.cv-achievement', '.cv-link-group', '.cv-version-card', '.cv-fact', '.skills-table tr', '.cv-list li']
          },
          jsPDF: {
            unit: 'pt',
            format: 'a4',
            orientation: 'portrait'
          }
        })
        .from(document.querySelector('.paper'))
        .save();

      if (isAutoMode && window.history && window.history.replaceState && options.cleanUrl) {
        window.history.replaceState({}, document.title, options.cleanUrl);
      }
    } catch (error) {
      console.error(error);

      if (!isAutoMode) {
        window.alert(messages.error || 'Failed to build the PDF. Refresh the page and try again.');
      }
    } finally {
      document.body.classList.remove('pdf-export');
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  }

  function setupActions(options) {
    var downloadButton = document.getElementById('download-pdf');
    var printButton = document.getElementById('print-resume');

    if (downloadButton) {
      downloadButton.addEventListener('click', function() {
        exportResumePdf(options, false);
      });
    }

    if (printButton) {
      printButton.addEventListener('click', function() {
        window.print();
      });
    }

    var searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('download') === '1') {
      exportResumePdf(options, true);
    }
  }

  function init(options) {
    var config = options || {};
    var locale = config.locale === 'ru' ? 'ru' : 'en';

    updateAge(locale);
    setupActions(config);
  }

  window.ResumePage = {
    init: init
  };
})();