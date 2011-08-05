#import "ApplicationMods.h"

@implementation ApplicationMods

+ (NSArray*) compiledMods
{
	NSMutableArray *modules = [NSMutableArray array];
	[modules addObject:[NSDictionary dictionaryWithObjectsAndKeys:@"test2",@"name",@"com.test",@"moduleid",@"0.1",@"version",@"955d6ed0-dca5-46d9-88e8-96847620266c",@"guid",@"",@"licensekey",nil]];
	return modules;
}

@end
