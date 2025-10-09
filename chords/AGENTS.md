Use simple code with zero external dependencies.
HTML/CSS/JS is autoformated by prettier on git commit.
I am trying to maintain simple structure for the project:

- Pure data (and maybe very simple transform functions) goes in data.js, UI in ui.js, logic in scripts.js, styling in styles.css, and HTML structure in index.html.
- In general, do not split these files into smaller files, especially for testing.
- We should work towards making this structure clean. If we are making changes in an area, and there is an opportunity to clean things up, it is OK to move things between these files.
  Tests should go in the tests/ directory, and will be run with node. In general, do not split files like scripts.js to make testing easier. Multiple testing files that focus on a particular test type are fine.
