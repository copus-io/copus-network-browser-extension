import React from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";

export const LogIn = (): JSX.Element => {
  return (
    <div
      className="relative w-[400px] h-[400px] rounded-[0px_0px_15px_15px] overflow-hidden bg-[linear-gradient(0deg,rgba(224,224,224,0.18)_0%,rgba(224,224,224,0.18)_100%),linear-gradient(0deg,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_100%)]"
      data-model-id="9043:53285"
    >
      <div className="flex flex-col w-[400px] h-[400px] items-end gap-[50px] pt-5 pb-[30px] px-5 absolute top-0 left-0 rounded-[0px_0px_15px_15px]">
        <Card className="flex-1 self-stretch w-full translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:200ms]">
          <CardContent className="flex flex-col items-center justify-center gap-[50px] px-[50px] py-[60px] h-full">
            <div className="flex flex-col items-start gap-5 relative self-stretch w-full flex-[0_0_auto] translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:400ms]">
              <h1 className="relative self-stretch mt-[-1.00px] font-h-3 font-[number:var(--h-3-font-weight)] text-off-black text-[length:var(--h-3-font-size)] text-center tracking-[var(--h-3-letter-spacing)] leading-[var(--h-3-line-height)] [font-style:var(--h-3-font-style)]">
                Please log in to start!
              </h1>

              <p className="relative self-stretch [font-family:'Lato',Helvetica] font-normal text-dark-grey text-lg text-center tracking-[0] leading-[25.2px]">
                Discover and share valuable digital gem
              </p>
            </div>

            <Button
              variant="outline"
              className="h-auto flex items-center justify-center gap-[30px] px-10 py-2.5 relative self-stretch w-full flex-[0_0_auto] rounded-[100px] border border-solid border-[#f23a00] bg-transparent hover:bg-[#f23a00]/5 transition-colors translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:600ms]"
            >
              <span className="relative w-fit mt-[-1.00px] [font-family:'Lato',Helvetica] font-bold text-red text-lg text-right tracking-[0] leading-[25.2px] whitespace-nowrap">
                Log in
              </span>
            </Button>
          </CardContent>
        </Card>
      </div>

      <img
        className="absolute top-[207px] left-0 w-[152px] h-[193px] translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:800ms]"
        alt="Ic fractopus open"
        src="https://c.animaapp.com/mg0kz9olCQ44yb/img/ic-fractopus-open.svg"
      />
    </div>
  );
};
