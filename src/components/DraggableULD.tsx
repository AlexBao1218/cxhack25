import React from "react";
import { useDraggable } from "@dnd-kit/core";

import type { ULD } from "@/types";

type DragSourceType = "list" | "position";

interface DraggableULDProps {
  uld: ULD;
  source: DragSourceType;
  positionId?: string;
  className?: string;
  children: React.ReactNode;
  ariaDescribedBy?: string;
}

const DraggableULD: React.FC<DraggableULDProps> = ({
  uld,
  source,
  positionId,
  className,
  children,
  ariaDescribedBy,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `${source}-${positionId ?? "list"}-${uld.id}`,
      data: {
        type: "ULD",
        uld,
        source,
        positionId,
      },
    });

  const draggableAttributes = ariaDescribedBy
    ? {
        ...attributes,
        "aria-describedby": ariaDescribedBy,
      }
    : attributes;

  const style: React.CSSProperties | undefined = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-60" : ""
      } ${className ?? ""}`}
      {...listeners}
      {...draggableAttributes}
    >
      {children}
    </div>
  );
};

export default DraggableULD;

