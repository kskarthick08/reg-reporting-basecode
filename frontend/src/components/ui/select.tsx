import * as React from "react"

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ value, onValueChange, disabled, className, style, children }, ref) => {
    // Extract only SelectContent children (ignore SelectTrigger and SelectValue)
    const content = React.Children.toArray(children).find(
      (child) => React.isValidElement(child) && child.type === SelectContent
    );

    const selectChildren = React.isValidElement(content) ? content.props.children : children;

    return (
      <select
        ref={ref}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        disabled={disabled}
        className={className || "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"}
        style={style}
      >
        {selectChildren}
      </select>
    );
  }
);
Select.displayName = "Select";

// These components are for API compatibility but don't render in the DOM
const SelectTrigger = (_props: { children?: React.ReactNode; id?: string; className?: string; style?: React.CSSProperties }) => null;
const SelectValue = (_props: { placeholder?: string }) => null;
const SelectContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const SelectItem = ({ value, children, style }: { value: string; children: React.ReactNode; style?: React.CSSProperties }) => (
  <option value={value} style={style}>{children}</option>
);

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
