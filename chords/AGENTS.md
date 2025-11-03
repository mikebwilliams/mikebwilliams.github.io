Use simple code with zero external dependencies.

HTML/CSS/JS is autoformated by prettier on git commit.

New features should get tests. Use `npx playwright test` to run all tests. You can modify the command to capture the output.

I am trying to maintain simple structure for the project:

- Pure data (and maybe very simple transform functions) goes in data.js, UI in ui.js, logic in scripts.js, styling in styles.css, and HTML structure in index.html. Tests in tests/
- In general, do not split the basic files into smaller files, especially for testing. Tests can smaller, logical files.
- We should work towards making this structure clean. If we are making changes in an area, and there is an opportunity to clean things up, it is OK to move things between these files.
  Tests should go in the tests/ directory, and will be run with node. In general, do not split files like scripts.js to make testing easier. Multiple testing files that focus on a particular test type are fine.

Javascript usage in the the layout and styling of the UI should be lightly avoided. When possible, use plain HTML and CSS to style elements. Some usage is expected, e.g. functional display of changes due to user input/action is likely to work best with javascript. The point isn't to never use javascript, but that we use it when the HTML+CSS solution is overly convoluted vs. some javascript. Similarly, prefer HTML elements that directly describe what they are rather than using tons of divs and spans. For instance, generally prefer <button> and <input> and <table> over emulating them with <div>. This is meant to be practical though, if a div solution and some styling is going to work much better, use it.
