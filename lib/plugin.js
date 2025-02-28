const plugin = {
  noteOption: {
    "open board": {
      check: async function (app, noteUUID) {
        return true;
      },

      run: async function (app, noteUUID) {
        this.noteUUID = noteUUID;
        const markdown = await app.getNoteContent({ uuid: noteUUID });
        let taskMap = await this.mapTasksToHeadings(app, markdown);

        // app.openSidebarEmbed(1, noteUUID);
        const uuid = await app.createNote('kanban embed test');
        app.insertNoteContent({ uuid: uuid }, `<object data="plugin://${app.context.pluginUUID}?${noteUUID}" data-aspect-ratio="1" />`);
      }
    }
  },

  async renderEmbed(app, ...args) {
    this.noteUUID = args[0]
    const markdown = await app.getNoteContent({ uuid: this.noteUUID });
    let taskMap = await this.mapTasksToHeadings(app, markdown);
    taskMap = JSON.stringify(taskMap);

    return `
<head>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">

  <style>
    /* Basic Reset */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, sans-serif;
      background-color: transparent;
      padding: 20px;
    }

    /* Kanban Container */
    .kanban-cont {
      display: flex;
      gap: 20px;
      overflow-x: auto;
    }

    /* Individual Kanban Board */
    .kanban-board {
      background-color: #191d20;
      border-radius: 10px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      flex-basis: calc((100% - 2 * 20px) / 3);
      flex-shrink: 0;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
    }

    /* Board Title */
    .board-title {
      /* background-color: #8f63ff; */
      color: white;
      padding: 10px;
      border-radius: 10px 10px 0 0;
      font-size: 1.2em;
      text-align: left;
      font-weight: bold;
      display: flex;
      justify-content: space-between;  /* Align title and button on opposite ends */
      align-items: center;  /* Vertically center both elements */
    }

    .add-task-btn {
      background-color: transparent;
      color: white;
      border: none;
      padding: 5px 10px;
      cursor: pointer;
      font-size: 1em;
      border-radius: 5px;
    }

    .add-task-btn:hover {
      background-color: rgba(0, 0, 0, 0.2);  /* Darker blue on hover */
    }
      
    .task-checkbox {
      margin: 0.3rem
    }

    .delete-col-btn {
      background-color: transparent;
      color: white;
      border: none;
      padding: 5px 10px;
      cursor: pointer;
      font-size: 1em;
      border-radius: 5px;
    }

    .delete-col-btn:hover {
      background-color: #f95a5a;  /* Darker blue on hover */
    }    
    
    /* Card Container inside Board */
    .kanban-board .card-container {
      padding: 10px;
      overflow-y: auto;
      flex-grow: 1;
      min-height: 100px;
      border: 2px dashed transparent;
    }

    /* Individual Cards */
    .kanban-board .card {
      border: 1px solid #35393e;
      background-color: #1d2126;
      color: white;
      border-radius: 5px;
      padding: 10px;
      margin-bottom: 10px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      cursor: grab;
    }

    .kanban-board .card:last-child {
      margin-bottom: 0;
    }

    .card-checkbox {
      margin-right: 0.5rem;
    }

    /* Highlight when dragging over */
    .kanban-board .card-container.drag-over {
      border: 1px dashed white;
    }

    #add-col {
      padding: 10px;
      border: none;
      box-shadow: 10px, 10px;
      border-radius: 0.4rem;
      margin-bottom: 1rem;
      background: #191d20;
      color: white;
    }

    #search-bar {
      background: #191d20;
      color: white;
      border: none;
      padding: 0.6rem;
      border-radius: 0.4rem;
    }
  
    .auto {cursor: auto;}

    @media (max-width: 768px) {
      .kanban-cont {
          flex-direction: column;
          align-items: center;
      }

      .kanban-board {
          width: 90%;
      }
    }
  </style>
</head>

<!-- <button id="add-col" style="cursor: pointer;">Add Column</button> -->
<button id="add-col" style="cursor: pointer;">
  <i class="fas fa-plus"></i> Add Column
</button>
<input type="text" id="search-bar" placeholder="Search tasks" />
<script>
  let taskMap = ${taskMap}

  let kanban_cont = document.createElement("div");
  kanban_cont.classList.add('kanban-cont');
  document.body.appendChild(kanban_cont);

  function generateHtml() {
    Object.keys(taskMap).forEach(heading => {
      if(heading == 'Completed tasks<!-- {"omit":true} -->') return
      let board = document.createElement('div');
      board.classList.add('kanban-board');
      kanban_cont.appendChild(board);

      let title = document.createElement('div');
      title.classList.add('board-title');
      let titleContent = document.createElement('span');
      titleContent.innerText = heading;
      titleContent.classList.add('auto')
      titleContent.contentEditable = true;
      title.appendChild(titleContent)
      board.appendChild(title);

      titleContent.addEventListener('blur', () => {
        const newTitle = titleContent.innerText.trim();

        if (newTitle !== heading && newTitle !== '') {
          let taskMapEntries = Object.entries(taskMap);

          // Find the index of the old heading
          let index = taskMapEntries.findIndex(entry => entry[0] === heading);

          if (index !== -1) {
            taskMapEntries[index][0] = newTitle;
            taskMap = Object.fromEntries(taskMapEntries);

            kanban_cont.innerHTML = '';
            generateHtml();
            addDragAndDropListeners();

            window.callAmplenotePlugin("update_note", taskMap);
          }
        }
     });

      let card_cont = document.createElement('div');
      card_cont.classList.add('card-container');
      card_cont.dataset.status = heading;
      board.appendChild(card_cont);

      taskMap[heading].forEach(task => {
        let card = document.createElement('div');
        card.classList.add('card');

        // Task checkbox
        let checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.classList.add('task-checkbox');
        checkbox.checked = task.completedAt || false; // Mark as checked if already done
        card.appendChild(checkbox);

        // Task content
        let taskContent = document.createElement('span');
        taskContent.innerText = task.content;
        taskContent.contentEditable = true;
        taskContent.classList.add('auto')
        card.appendChild(taskContent);

        // Event listener for content modification
        taskContent.addEventListener('input', () => {
          const newContent = taskContent.innerText.trim();
          if (newContent !== task.content) {
            // Update taskMap with the new content
            taskMap[heading].forEach(t => {
              if (t.uuid === task.uuid) {
                t.content = newContent;
              }
            });
            window.callAmplenotePlugin("update_note", taskMap);
          }
        });

        card.draggable = true;
        card.dataset.uuid = task.uuid;
        card.dataset.status = heading;
        card_cont.appendChild(card);

        // Event listener for marking the task as done
        checkbox.addEventListener('change', (e) => {
          window.callAmplenotePlugin('update_task', task.uuid, e.target.checked)
          if(e.target.checked) {
            task.completedAt = Math.floor(Date.now() / 1000);
          } else {
            task.completedAt = null;
          }
          taskContent.style.textDecoration = task.completedAt ? 'line-through' : 'none';
          window.callAmplenotePlugin("update_note", taskMap); // Update taskMap in the note
        });

        // Initial style for completed tasks
        if (task.isDone) {
          taskContent.style.textDecoration = 'line-through';
        }
      });
      let action_cont = document.createElement('div');
      title.appendChild(action_cont);
      // Add task button
      let addTaskBtn = document.createElement('button');
      addTaskBtn.innerText = '+';
      addTaskBtn.classList.add('add-task-btn');
      action_cont.appendChild(addTaskBtn);

      // Delete column button
      let deleteColBtn = document.createElement('button');
      deleteColBtn.innerHTML = '<i class="fa-xs fa-solid fa-trash"></i>';
      deleteColBtn.classList.add('delete-col-btn');
      action_cont.appendChild(deleteColBtn);

      // Event listener for adding a new task
      addTaskBtn.addEventListener('click', () => {
        window.callAmplenotePlugin("prompt", "Enter task content").then(taskContent => {
          if (taskContent) {
            window.callAmplenotePlugin("add_task", taskContent).then(taskUUID => {
              taskMap[heading].push({ content: taskContent, uuid: taskUUID });
              kanban_cont.innerHTML = ''; // Clear current content
              generateHtml(); // Regenerate the Kanban board
              addDragAndDropListeners(); // Reapply drag-and-drop listeners
              window.callAmplenotePlugin("update_note", taskMap);
            })
          }
        })
      });

      // Event listener for deleting the column
      deleteColBtn.addEventListener('click', () => {
        window.callAmplenotePlugin('confirm', "Are you sure you want to delete this column? this action can't be reverted",[ { icon: "post_add", label: "Yes" },  { icon: "post_add", label: "No" } ] ).then(action => {
          if(action != 0) return
          delete taskMap[heading]; // Remove the column from taskMap
          kanban_cont.innerHTML = ''; // Clear current content
          generateHtml(); // Regenerate the Kanban board without the deleted column
          addDragAndDropListeners(); // Reapply drag-and-drop listeners
          window.callAmplenotePlugin("update_note", taskMap); // Update taskMap in the note
        })
        
      });
    });
  }

  // Dragging feature
  function addDragAndDropListeners() {
    const cards = document.querySelectorAll(".card");
    const containers = document.querySelectorAll(".card-container");

    let draggedCard = null;

    cards.forEach((card) => {
      card.addEventListener("dragstart", (e) => {
        draggedCard = card;
        setTimeout(() => {
          card.style.display = "none";
        }, 0);
      });

      card.addEventListener("dragend", () => {
        setTimeout(() => {
          draggedCard.style.display = "block";
          draggedCard = null;
        }, 0);
      });
    });

    containers.forEach((container) => {
      container.addEventListener("dragover", (e) => {
        e.preventDefault();
        container.classList.add("drag-over");
      });

      container.addEventListener("dragleave", () => {
        container.classList.remove("drag-over");
      });

      container.addEventListener("drop", (e) => {
        e.preventDefault();
        container.classList.remove("drag-over");

        if (draggedCard) {
            container.appendChild(draggedCard);

            let newStatus = container.getAttribute('data-status');
            let oldStatus = draggedCard.getAttribute('data-status');
            let uuid = draggedCard.getAttribute('data-uuid');

            // Find the task in the old status
            const taskIndex = taskMap[oldStatus].findIndex(task => task.uuid === uuid);
            if (taskIndex !== -1) {
                const task = taskMap[oldStatus].splice(taskIndex, 1)[0];
                taskMap[newStatus].push(task);
                draggedCard.setAttribute('data-status', newStatus);

                window.callAmplenotePlugin("update_note", taskMap);
            }
        }
      });
    });
  }

  // Initial load
  let col_btn = document.getElementById("add-col");
  col_btn.addEventListener('click', () => {
    window.callAmplenotePlugin("prompt", "Enter board heading").then(heading => {
      if (heading) {
        taskMap[heading] = [];

        kanban_cont.innerHTML = ''; // Clear content
        generateHtml(); // Re-generate the kanban board
        addDragAndDropListeners(); // Re-apply drag-and-drop listeners after re-rendering
        window.callAmplenotePlugin("update_note", taskMap);
      }
    })
  });

  const searchBar = document.getElementById('search-bar');
  searchBar.addEventListener('input', (e) => {
    const query = e.target.value.trim();

    const cards = document.querySelectorAll('.card');
    
    cards.forEach(card => {
      const taskContent = card.querySelector('span').innerText.toLowerCase();
      if (query === '') {
        card.style.display = 'block'; // Show all tasks when search is empty
      } else if (taskContent.includes(query.toLowerCase())) {
        card.style.display = 'block'; // Show matching tasks
      } else {
        card.style.display = 'none';  // Hide non-matching tasks
      }
    });
  });


  generateHtml();
  addDragAndDropListeners();
</script>
`;
  },

  async onEmbedCall(app, ...args) {
    let action = args[0]
    console.log(args)
    if (action === "prompt") {
      let result = await app.prompt(args[1]);
      return result.replace(/\n/g, ''); // Remove all line breaks
    }
    else if (action == "update_note") {
      let taskMap = args[1]
      let markdown = this.generateMarkdown(taskMap)
      await app.replaceNoteContent({ uuid: this.noteUUID }, markdown);
    }
    else if (action == "add_task") {
      const taskUUID = await app.insertTask({ uuid: this.noteUUID }, { text: args[1] });
      return taskUUID
    }
    else if (action == "confirm") {
      const actionIndex = await app.alert(args[1], {
        actions: args[2]
      });

      return actionIndex;
    }
    else if (action == "update_task") {
      if (args[2]) {
        await app.updateTask(args[1], { completedAt: Math.floor(Date.now() / 1000) });
      } else {
        await app.updateTask(args[1], { completedAt: null });
      }
    }
  },

  generateMarkdown(taskMap) {
    let markdown = '';

    Object.keys(taskMap).forEach(heading => {
      markdown += `# ${heading}\n\n`;

      taskMap[heading].forEach(task => {
        markdown += `- [ ] ${task.content}<!-- {"uuid":"${task.uuid}"} -->\n`;
      });

      markdown += '\n'; // Add a line break between sections
    });

    return markdown.trim();
  },

  async mapTasksToHeadings(app, markdown) {
    const headingRegex = /^(#+) (.+)$/gm;
    const taskRegex = /- \[ \] (.+?)<!-- {"uuid":"(.+?)"} -->/g;
    const mapping = {};
    let currentHeading = '';

    const lines = markdown.split('\n');

    for (const line of lines) {
      const headingMatch = headingRegex.exec(line);
      if (headingMatch) {
        // Store current heading
        currentHeading = headingMatch[2].trim();
        mapping[currentHeading] = [];
      } else {
        // Match tasks under the current heading
        const taskMatch = taskRegex.exec(line);
        if (taskMatch && currentHeading) {
          const taskContent = taskMatch[1].trim();
          const taskUUID = taskMatch[2].trim();

          // Fetch task information
          const taskInfo = await app.getTask(taskUUID);
          if (taskInfo) {
            mapping[currentHeading].push(taskInfo);
          }
        }
      }
    }
    return mapping;
  }
}
