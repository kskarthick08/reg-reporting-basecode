import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <div style={{
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
    marginLeft: '0.5rem'
  }}>
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={{
        width: '64px',
        height: '32px',
        backgroundColor: props.checked ? '#22c55e' : '#ef4444',
        position: 'relative',
        boxShadow: props.checked
          ? '0 4px 12px rgba(34, 197, 94, 0.4), inset 0 2px 4px rgba(0, 0, 0, 0.1)'
          : '0 4px 12px rgba(239, 68, 68, 0.4), inset 0 2px 4px rgba(0, 0, 0, 0.1)',
        border: 'none',
        minWidth: '64px',
        minHeight: '32px',
      }}
      {...props}
    >
      {/* ON/OFF Text Labels */}
      <span
        style={{
          position: 'absolute',
          left: props.checked ? '8px' : 'auto',
          right: props.checked ? 'auto' : '8px',
          fontSize: '10px',
          fontWeight: '800',
          color: 'white',
          userSelect: 'none',
          pointerEvents: 'none',
          letterSpacing: '0.5px',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
          transition: 'all 300ms ease',
          opacity: 0.95,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      >
        {props.checked ? 'ON' : 'OFF'}
      </span>

      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block rounded-full shadow-lg transition-transform duration-300"
        )}
        style={{
          width: '24px',
          height: '24px',
          backgroundColor: 'white',
          transform: props.checked ? 'translateX(32px)' : 'translateX(4px)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25), 0 1px 3px rgba(0, 0, 0, 0.15)',
          position: 'absolute',
          top: '4px',
          left: '0',
        }}
      />
    </SwitchPrimitive.Root>
  </div>
))
Checkbox.displayName = SwitchPrimitive.Root.displayName

export { Checkbox }
