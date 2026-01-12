document.addEventListener('DOMContentLoaded', () => {
  const lists = document.querySelectorAll('[data-draggable-list]');
  const editableForms = document.querySelectorAll('[data-admin-form]');

  lists.forEach((list) => {
    let dragging = null;

    list.querySelectorAll('[draggable="true"]').forEach((item) => {
      item.addEventListener('dragstart', (event) => {
        dragging = item;
        item.classList.add('is-dragging');
        event.dataTransfer.effectAllowed = 'move';
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('is-dragging');
        dragging = null;
        syncOrder(list);
      });
    });

    list.addEventListener('dragover', (event) => {
      event.preventDefault();
      const afterElement = getDragAfterElement(list, event.clientY);
      if (!dragging) {
        return;
      }
      if (afterElement == null) {
        list.appendChild(dragging);
      } else {
        list.insertBefore(dragging, afterElement);
      }
    });

    syncOrder(list);
  });

  function syncOrder(list) {
    const items = list.querySelectorAll('[draggable="true"]');
    items.forEach((item, index) => {
      const indexCell = item.querySelector('td');
      if (indexCell) {
        const textNodes = Array.from(indexCell.childNodes).filter(
          (node) => node.nodeType === Node.TEXT_NODE
        );
        if (textNodes.length) {
          textNodes[textNodes.length - 1].textContent = ' ' + (index + 1);
        }
      }
    });
  }

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('[draggable="true"]:not(.is-dragging)')];

    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset, element: child };
        }
        return closest;
      },
      { offset: Number.NEGATIVE_INFINITY, element: null }
    ).element;
  }

  editableForms.forEach((form) => {
    const inputs = Array.from(form.querySelectorAll('input[type="text"], input[type="checkbox"]'));
    let dirty = false;

    const setDirty = () => {
      dirty = true;
      form.classList.add('is-dirty');
    };

    inputs.forEach((input) => {
      input.addEventListener('input', setDirty);
      input.addEventListener('change', setDirty);
    });

    form.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
      }
    });

    form.addEventListener('submit', () => {
      const checkboxes = form.querySelectorAll('[data-published-checkbox]');
      checkboxes.forEach((checkbox) => {
        const parent = checkbox.closest('[draggable="true"], .admin-card');
        if (!parent) {
          return;
        }
        const hidden = parent.querySelector('[data-published-input]');
        if (hidden) {
          hidden.value = checkbox.checked ? '1' : '0';
        }
      });
      dirty = false;
      form.classList.remove('is-dirty');
    });

    window.addEventListener('beforeunload', (event) => {
      if (!dirty) {
        return;
      }
      event.preventDefault();
      event.returnValue = '';
    });
  });

  const modal = document.querySelector('[data-confirm-modal]');
  if (modal) {
    const confirmOk = modal.querySelector('[data-confirm-ok]');
    const confirmCancel = modal.querySelector('[data-confirm-cancel]');
    let targetFormId = null;

    document.querySelectorAll('[data-confirm-delete]').forEach((button) => {
      button.addEventListener('click', () => {
        targetFormId = button.getAttribute('data-form-id');
        modal.classList.add('is-visible');
      });
    });

    const closeModal = () => {
      modal.classList.remove('is-visible');
      targetFormId = null;
    };

    confirmCancel.addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });

    confirmOk.addEventListener('click', () => {
      if (!targetFormId) {
        return;
      }
      const form = document.getElementById(targetFormId);
      if (form) {
        form.submit();
      }
    });
  }
});
