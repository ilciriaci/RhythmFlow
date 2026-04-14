import { Slider as SliderPrimitive } from "@base-ui/react/slider"

import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderPrimitive.Root.Props) {
  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max]

  return (
    <SliderPrimitive.Root
      className={cn("relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col pointer-events-auto", className)}
      data-slot="slider"
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full h-10 items-center cursor-pointer">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative grow overflow-hidden rounded-full bg-white/10 data-horizontal:h-2 data-horizontal:w-full data-vertical:h-full data-vertical:w-2"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-primary data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {_values.map((_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            className="relative block size-7 shrink-0 rounded-full border-2 border-primary bg-white shadow-[0_0_20px_rgba(255,255,255,0.4)] ring-primary/20 transition-all hover:scale-110 hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden active:scale-95 active:ring-4 disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing after:absolute after:-inset-8 after:content-[''] z-50"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
