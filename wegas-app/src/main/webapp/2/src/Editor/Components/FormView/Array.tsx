import * as React from 'react';
import { css, cx } from 'emotion';
import { WidgetProps } from 'jsoninput/typings/types';
import { IconButton } from '../../../Components/Inputs/Buttons/IconButton';
import { Menu, MenuItem, SelectedMenuItem } from '../../../Components/Menu';
import { CommonViewContainer, CommonView } from './commonView';
import { Labeled, LabeledView } from './labeled';
import { themeVar } from '../../../Components/Theme';
import { useDrag, useDrop } from 'react-dnd';
import { dropZoneFocusCss } from '../../../Components/Contexts/DefaultDndProvider';
import { array_move } from '../../../Helper/tools';
import { Item } from '../Tree/TreeSelect';

const transparentStyle = css({
  opacity: 0,
  transition: 'opacity .5s .1s',
  'div:hover > &': {
    opacity: 1,
  },
});

const listElementContainerStyle = css({
  display: 'flex',
  backgroundColor: themeVar.primaryHoverColor,
  padding: '4px',
  marginTop: '4px',
});

const listElementStyle = css({
  flex: 1,
  // Reduce vertical space between array elements:
  '& > div': {
    marginTop: 0,
  },
});

const dropZoneStyle = css({
  ...dropZoneFocusCss,
  transition: 'min-height .5s .1s',
});

const handleStyle = css({
  display: 'inline-grid',
});

interface AdderProps<T> {
  onChildAdd: (value?: SelectedMenuItem<T>) => void;
  choices?: MenuItem<T>[];
  id?: string;
  tooltip?: string;
}

function Adder<T>({ onChildAdd, choices, id, tooltip }: AdderProps<T>) {
  if (Array.isArray(choices)) {
    return (
      <Menu
        items={choices}
        icon="plus-circle"
        onSelect={item => onChildAdd(item)}
      />
    );
  }
  return (
    <IconButton
      id={id}
      icon="plus-circle"
      onClick={() => onChildAdd()}
      tooltip={tooltip}
    />
  );
}

interface DnDArrayItem {
  type: string;
  index: number;
}

interface DnDArrayDragMonitor {
  dragStyle: React.CSSProperties;
}

interface ArrayItemProps {
  /**
   * index - The index of the item in the array
   */
  index: number;
  /**
   * onChildRemove - the function that manages click on the trash icon (the icon won't be displayed if the function is undefined)
   */
  onChildRemove?: (index: number) => void;
  /**
   * unmovable - if set, the item could not be moved to another and the move handle won't be displayed
   */
  unmovable?: boolean;
  /**
   * className - the classes of the element
   */
  className?: string;
  /**
   * style - the classes of the element
   */
  style?: React.CSSProperties;
}

const dndItemType = 'ArrayItem';

function ArrayItem({
  children,
  index,
  onChildRemove,
  unmovable,
  style,
  className,
}: React.PropsWithChildren<ArrayItemProps>) {
  const [{ dragStyle }, drag, preview] = useDrag<
    DnDArrayItem,
    unknown,
    DnDArrayDragMonitor
  >({
    item: { type: dndItemType, index },
    collect: monitor => {
      return {
        dragStyle: {
          opacity: monitor.isDragging() ? 0.4 : 1,
        },
      };
    },
  });

  return (
    <div
      ref={preview}
      className={cx(listElementContainerStyle, className)}
      style={{ ...style, ...dragStyle }}
    >
      <div className={listElementStyle}>{children}</div>
      <div className={cx(handleStyle, transparentStyle)}>
        {onChildRemove ? (
          <IconButton
            icon="trash"
            onClick={() => onChildRemove(index)}
            tooltip="Delete this group"
          />
        ) : null}
        {!unmovable && (
          <div ref={drag}>
            <IconButton icon="arrows-alt" />
          </div>
        )}
      </div>
    </div>
  );
}

interface DnDArrayDropMonitor {
  isOverCurrent?: boolean;
  canDrop?: boolean;
}

interface ArrayDropzoneProps {
  /**
   * onDrop - the function that is called when an item is dropped
   */
  onDrop: (index: number) => void;
  /**
   * className - the classes of the element
   */
  className?: string;
  /**
   * style - the classes of the element
   */
  style?: React.CSSProperties;
}

function ArrayDropzone({ onDrop, className, style }: ArrayDropzoneProps) {
  const [{ isOverCurrent, canDrop }, dropTab] = useDrop<
    DnDArrayItem,
    unknown,
    DnDArrayDropMonitor
  >({
    accept: dndItemType,
    canDrop: () => true,
    drop: ({ index }) => onDrop(index),
    collect: monitor => ({
      isOverCurrent: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });

  return (
    <div
      className={cx(dropZoneStyle, className)}
      style={{
        minHeight: isOverCurrent ? '50px' : canDrop ? '10px' : '0px',
        ...style,
      }}
      ref={dropTab}
    />
  );
}

export interface IArrayProps
  extends WidgetProps.ArrayProps<
    {
      choices?: Item<string>[];
      tooltip?: string;
      disabled?: boolean;
      userOnChildAdd?: (value?: {}) => void;
      // TODO : Use the following view props!
      highlight?: boolean;
      sortable?: boolean;
    } & CommonView &
      LabeledView
  > {
  value?: {}[];
}

interface DropArrayProps<T> {
  array?: {}[];
  onMove?: (array?: {}[]) => void;
  onChildRemove?: (index: number) => void;
  onChildAdd?: (value?: SelectedMenuItem<T>) => void;
  choices?: MenuItem<T>[];
  tooltip?: string;
  label?: React.ReactNode;
  maxItems?: number;
  minItems?: number;
  inputId?: string;
  disabled?: boolean;
  readOnly?: boolean;
  unsortable?: boolean;
}

export function DragDropArray<T>({
  array,
  onMove,
  onChildRemove,
  onChildAdd,
  choices,
  tooltip,
  label,
  maxItems = Infinity,
  minItems = 0,
  inputId,
  disabled,
  readOnly,
  children,
  unsortable,
}: React.PropsWithChildren<DropArrayProps<T>>) {
  const valueLength = Array.isArray(array) ? array.length : 0;
  return (
    <>
      {label}
      {!unsortable &&
        maxItems > valueLength &&
        !disabled &&
        !readOnly &&
        onChildAdd && (
          <Adder
            id={inputId}
            onChildAdd={onChildAdd}
            choices={choices}
            tooltip={tooltip}
          />
        )}
      {React.Children.map(children, (c, i) => (
        <>
          {onMove && !unsortable && (
            <ArrayDropzone
              onDrop={index => {
                onMove(array_move(array, index, i));
              }}
            />
          )}
          <ArrayItem
            index={i}
            onChildRemove={
              minItems < valueLength && !disabled && !readOnly
                ? onChildRemove
                : undefined
            }
            unmovable={
              !onMove ||
              unsortable ||
              (valueLength < 2 && !disabled && !readOnly)
            }
          >
            {c}
          </ArrayItem>
        </>
      ))}
      {onMove && !unsortable && (
        <ArrayDropzone
          onDrop={index => {
            onMove(array_move(array, index, valueLength));
          }}
        />
      )}
    </>
  );
}

function ArrayWidget({
  errorMessage,
  view,
  onChange,
  onChildAdd,
  onChildRemove,
  value,
  children,
  schema,
}: IArrayProps) {
  const {
    label,
    description,
    choices,
    disabled,
    readOnly,
    tooltip,
    userOnChildAdd,
    sortable,
  } = view;
  const { maxItems, minItems } = schema;
  const onNewChild = userOnChildAdd ? userOnChildAdd : onChildAdd;
  return (
    <CommonViewContainer errorMessage={errorMessage} view={view}>
      <Labeled label={label} description={description}>
        {({ inputId, labelNode }) => (
          <DragDropArray
            onMove={onChange}
            onChildAdd={i => onNewChild(i ? i.value : undefined)}
            onChildRemove={onChildRemove}
            array={value}
            choices={choices}
            disabled={disabled}
            readOnly={readOnly}
            inputId={inputId}
            label={labelNode}
            maxItems={maxItems}
            minItems={minItems}
            tooltip={tooltip}
            unsortable={!sortable}
          >
            {children}
          </DragDropArray>
        )}
      </Labeled>
    </CommonViewContainer>
  );
}

export default ArrayWidget;
